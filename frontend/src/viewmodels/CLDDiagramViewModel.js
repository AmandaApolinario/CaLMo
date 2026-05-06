import { ref, markRaw, shallowRef} from 'vue';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';
import {
  NODE_COLORS,
  EDGE_COLORS,
  getArchetypeColor,
  getLoopColor,
  getArchetypeInstanceColor,
  ensureContrastWithBackground, LOOP_COLORS, // ensure instance color is not too close to node regular color
} from '@/theme/colors';
import { makePieEllipseDataUrl } from '@/theme/nodeImages';

export function useCLDDiagramViewModel() {
  const networkContainer = ref(null);
  const network = shallowRef(null);
  const zoomLevel = ref(1);
  const selectedNode = ref(null);
  const selectedNodeInfo = ref({ nodeName: '', loops: [], archetypes: [] });
  const interactionMode = ref('select');
  const edgeAddedCallback = ref(null);
  const hasSelection = ref(false);
  const nodeDraggedCallback = ref(null);

  // Persisted node positions by diagram id
  const diagramPositions = ref({});

  // Legend items for this diagram (one entry per archetype *instance*)
  const legendArchetypes = ref([]); // [{ id, label, color }]

  // Archetype instance metadata accessible for popup
  // Map: archetypeId -> { type, index, color, label }
  let archetypeMetaById = new Map();

  // Break labels with orphan-avoidance
  function wrapLabel(text, maxChars = 24, maxLines = 3) {
    if (!text) return '';
    const words = String(text).trim().split(/\s+/);
    if (words.length === 1) return words[0];

    const lines = [];
    let cur = '';
    for (const w of words) {
      const next = (cur ? cur + ' ' : '') + w;
      if (next.length <= maxChars) {
        cur = next;
      } else {
        if (cur) lines.push(cur);
        cur = w;
        if (lines.length === maxLines - 1) break;
      }
    }
    if (cur && lines.length < maxLines) lines.push(cur);

    if (lines.length > maxLines) {
      const joined =
        (lines.slice(0, maxLines - 1).join(' ') + ' ' + lines.slice(maxLines - 1).join(' '))
          .slice(0, maxChars - 1) + '…';
      return [...lines.slice(0, maxLines - 1), joined].join('\n');
    }

    const isShortWord = (w) => w.length <= 3;
    const toWords = (s) => s.split(/\s+/);
    const MIN_LAST_RATIO = 0.45;

    if (lines.length >= 2) {
      let last = lines[lines.length - 1];
      let prev = lines[lines.length - 2];
      const lastWords = toWords(last);
      const prevWords = toWords(prev);

      const lastIsTooShort =
        last.length < Math.max(6, Math.floor(maxChars * MIN_LAST_RATIO)) ||
        (lastWords.length <= 2 && lastWords.every(isShortWord));

      if (lastIsTooShort && prevWords.length > 1) {
        const moved = prevWords.pop();
        prev = prevWords.join(' ');
        last = moved + (last ? ' ' + last : '');
        lines[lines.length - 2] = prev;
        lines[lines.length - 1] = last;
      }
    }

    for (let i = 0; i < lines.length - 1; i++) {
      const lw = toWords(lines[i]);
      const nw = toWords(lines[i + 1]);
      if (lw.length === 1 && nw.length > 1) {
        const moved = nw.shift();
        lines[i] = (lw.join(' ') + ' ' + moved).trim();
        lines[i + 1] = nw.join(' ');
      }
    }

    if (lines.length > maxLines) {
      const last = lines.slice(maxLines - 1).join(' ');
      lines.length = maxLines;
      lines[maxLines - 1] = last.slice(0, maxChars - 1) + '…';
    }

    return lines.join('\n');
  }

  // Roman numerals for 1..20 (sufficient for legend/use case)
  function toRoman(n) {
    const map = [
      [10, 'X'], [9, 'IX'], [8, 'VIII'], [7, 'VII'], [6, 'VI'],
      [5, 'V'], [4, 'IV'], [3, 'III'], [2, 'II'], [1, 'I']
    ];
    let num = Math.max(1, Math.min(20, n));
    let out = '';
    for (const [v, s] of map) {
      while (num >= v) { out += s; num -= v; }
    }
    return out;
  }

  function createDiagram(diagram, container) {
    if (!container || !diagram) return;
    if (network.value !== null) {
      network.value.destroy();
      network.value = null;
    }
    networkContainer.value = container;

    // Saved positions for this diagram
    const savedPositions = getSavedPositions(diagram.id);

    // ---- Pass 1: count instances per archetype type ----
    const typeTotals = new Map(); // type -> total instances
    (diagram.archetypes || []).forEach((arch) => {
      const t = arch.type;
      typeTotals.set(t, (typeTotals.get(t) || 0) + 1);
    });

    // ---- Pass 2: assign index/colors/labels per instance + build node mapping ----
    archetypeMetaById = new Map();
    const typeIndices = new Map();          // type -> next index (0-based)
    const archetypeIdsByNode = new Map();   // nodeId -> [archetypeId, ...]
    const processedSignatures = new Set();

    (diagram.archetypes || []).forEach((arch) => {
      const t = arch.type;

      const varIds = (arch.variables || [])
      .map(v => typeof v === 'object' ? v.id : v)
      .sort()
      .join('|');
      const signature = `${t}-${varIds}`;
      const archKey = arch.id || signature;
      if (processedSignatures.has(signature)) return;
      processedSignatures.add(signature)

      const idx = typeIndices.get(t) || 0;
      typeIndices.set(t, idx + 1);

      // Base instance color then ensure it's distinct from regular node color
      const total = typeTotals.get(t) || 1;
      const color = getArchetypeInstanceColor(t, idx, total);

      // Label: if only one instance of this type, omit numbering; else use Roman numerals
      const label =
        total === 1 ? formatArchetypeName(t) : `${formatArchetypeName(t)} ${toRoman(idx + 1)}`;

      archetypeMetaById.set(archKey, {
        type: t,
        color,
        label: formatArchetypeName(t)
    });

      (arch.variables || []).forEach((v) => {
        const id = typeof v === 'object' ? v.id : v;
        if (id == null) return;
        if (!archetypeIdsByNode.has(id)) {
            archetypeIdsByNode.set(id, []);
        }
        archetypeIdsByNode.get(id).push(archKey);
      });
    });

    // Legend = one entry per archetype instance
    legendArchetypes.value = Array.from(archetypeMetaById.entries()).map(([id, m]) => ({
      id,
      label: m.label,
      color: m.color
    }));

    // ---- Nodes (wrapped labels; color by instance membership) ----
    const nodes = new DataSet(
      (diagram.nodes || []).map(node => {
        const wrapped = wrapLabel(node.name, 30, 3);

        const nodeObj = {
          id: node.id,
          originalLabel: node.name,
          label: wrapped,
          shape: 'ellipse',
          font: { size: 18, color: '#000000', face: 'Arial', multi: true },
          borderWidth: 2,
          widthConstraint: { maximum: 200 },
          title: node.name
        };

        if (savedPositions && savedPositions[node.id]) {
          nodeObj.x = savedPositions[node.id].x;
          nodeObj.y = savedPositions[node.id].y;
        } else if (node.x !== undefined && node.y !== undefined) {
          nodeObj.x = node.x;
          nodeObj.y = node.y;
        }

        const archKeys = archetypeIdsByNode.get(nodeObj.id) || [];

        if (archKeys.length >= 2) {
          const colors = [...new Set(
            archKeys.map(id => archetypeMetaById.get(id)?.color).filter(Boolean)
          )];
          nodeObj.shape = 'image';
          nodeObj.image = makePieEllipseDataUrl({ label: wrapped, colors });
          nodeObj.label = '';
          nodeObj.shadow = true;

        } else if (archKeys.length === 1) {
          const meta = archetypeMetaById.get(archKeys[0]);
          let typeFromKey = null;
          if (typeof key === 'string' && key.includes('-')) {
              typeFromKey = key.split('-')[0];
          }
          const c = meta?.color || getArchetypeColor(meta?.type || typeFromKey);
          nodeObj.shape = 'ellipse';
          nodeObj.color = {
            background: c,
            border: c,
            highlight: { background: c, border: c }
          };

        } else {
          nodeObj.shape = 'ellipse';
          nodeObj.color = {
            background: NODE_COLORS.regular.background,
            border: NODE_COLORS.regular.border,
            highlight: {
              background: NODE_COLORS.regular.highlightBackground,
              border: NODE_COLORS.regular.highlightBorder
            }
          };
        }

        return nodeObj;
      })
    );

    // ---- Edges ----
    const edges = new DataSet(
      (diagram.edges || []).map(edge => {
        const isPositive = edge.polarity === 'positive';
        const c = isPositive ? EDGE_COLORS.positive : EDGE_COLORS.negative;
        return {
          id: edge.id,
          from: edge.source,
          to: edge.target,
          label: isPositive ? '+' : '-',
          arrows: 'to',
          font: { size: 22, color: c.base },
          width: 2,
          color: { color: c.base, highlight: c.highlight }
        };
      })
    );

    const hasSavedPositions = !!savedPositions;

    // ---- Network options ----
    const options = {
      nodes: {
        shape: 'ellipse',
        shadow: true,
        borderWidth: 2,
        margin: 10,
        scaling: { label: { enabled: true } },
        fixed: { x: false, y: false },
        font: { multi: true },
        shapeProperties: {
          useImageSize: true,
          useBorderWithImage: false
        }
      },
      edges: { smooth: { type: 'curvedCW', roundness: 0.2 },
        width: 2
      },
      interaction: {
        hover: true,
        navigationButtons: true,
        keyboard: true,
        multiselect: false,
        zoomView: true,
        dragNodes: interactionMode.value === 'select',
        selectable: interactionMode.value === 'select'
      },
      physics: {
        enabled: false,
        stabilization: { enabled: !hasSavedPositions, iterations: 100, fit: true },
        barnesHut: {
          gravitationalConstant: -2000, centralGravity: 0.05,
          springLength: 150, springConstant: 0.04,
          damping: 0.5, avoidOverlap: 1.0
        }
      },
      layout: { improvedLayout: true, randomSeed: 42 },
      manipulation: {
        enabled: false,
        controlNodeStyle: {
          shape: 'dot',
          size: 6,
          color: {
            background: EDGE_COLORS.positive.base,
            border: EDGE_COLORS.positive.base,
            highlight: {
                background: EDGE_COLORS.positive.base,
                border: EDGE_COLORS.positive.base
            }
          }
        },
        addEdge: (edgeData, callback) => {
          if (edgeData.from === edgeData.to) {
            callback(null);
            setTimeout(() => {
              if (network.value && (interactionMode.value === 'addPositiveEdge' || interactionMode.value === 'addNegativeEdge')) {
                network.value.addEdgeMode();
              }
            }, 10);
            return;
          }

          const fromNode = network.value.body.data.nodes.get(edgeData.from);
          const toNode = network.value.body.data.nodes.get(edgeData.to);

          if (edgeAddedCallback.value && fromNode && toNode) {
            const polarity = interactionMode.value === 'addNegativeEdge' ? 'negative' : 'positive';
            edgeAddedCallback.value(fromNode.id, toNode.id, polarity);
          }

          callback(null);
          setTimeout(() => {
            if (network.value && (interactionMode.value === 'addPositiveEdge' || interactionMode.value === 'addNegativeEdge')) {
              network.value.addEdgeMode();
            }
          }, 10);
        }
      },
    };

    // ---- Create network ----
    network.value = markRaw(new Network(networkContainer.value, { nodes, edges }, options));

    // Selection & UX
    network.value.on('selectNode', (params) => handleNodeSelection(params, diagram));
    network.value.on('click', (params) => {
      if (params.nodes.length === 0 && params.edges.length === 0) {
        clearNodeSelection();
      }
      else if (params.nodes.length > 0) {
        selectedNode.value = params.nodes[0];
        selectedNodeInfo.value = { nodeName: '', loops: [], archetypes: [] };
      }
      else if (params.edges.length > 0) {
        selectedNode.value = null;
        selectedNodeInfo.value = { nodeName: '', loops: [], archetypes: [] };
      }
    });
    network.value.on('dragEnd', () => saveNodePositions(diagram.id));
    network.value.on('dragging', (params) => {
        if (params.nodes.length > 0 && nodeDraggedCallback.value) {
            const nodeId = params.nodes[0];
            const pos = network.value.getPositions([nodeId])[nodeId];
            nodeDraggedCallback.value(nodeId, pos);
        }
    });
    network.value.on('select', () => { hasSelection.value = true; });
    network.value.on('deselect', () => {
      const sel = network.value.getSelection();
      hasSelection.value = sel.nodes.length > 0 || sel.edges.length > 0;
    });
    network.value.on('doubleClick', (params) => {
      if (params.nodes.length > 0) {
        handleNodeSelection({ nodes: params.nodes }, diagram);
      }
    });

    network.value.on('afterDrawing', (ctx) => {
      if (!diagram.feedback_loops || diagram.feedback_loops.length === 0) return;

      diagram.feedback_loops.forEach((loop, index) => {
        const isReinforcing = String(loop.type).toUpperCase().includes('REINFORCING') ||
                              String(loop.type).toUpperCase() === 'POSITIVE';

        const prefix = isReinforcing ? 'R' : 'B';
        const labelText = `${prefix}${index + 1}`;
        const color = isReinforcing ? LOOP_COLORS.REINFORCING: LOOP_COLORS.BALANCING;

        const varIds = (loop.variables || []).map(v => typeof v === 'object' ? v.id : v);
        if (varIds.length === 0) return;

        const positions = network.value.getPositions(varIds);
        let sumX = 0, sumY = 0, validNodes = 0;

        varIds.forEach(id => {
          if (positions[id]) {
            sumX += positions[id].x;
            sumY += positions[id].y;
            validNodes++;
          }
        });

        if (validNodes > 0) {
          const centerX = sumX / validNodes;
          const centerY = sumY / validNodes;

          ctx.beginPath();
          ctx.arc(centerX, centerY, 16, 0, 2 * Math.PI, false);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = color;
          ctx.stroke();

          ctx.font = 'bold 14px Arial';
          ctx.fillStyle = color;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(labelText, centerX, centerY);
        }
      });
    });

    setTimeout(() => {
      if (network && network.value) {
        network.value.fit({ animation: false });
      }
    }, 500);

    if (!savedPositions) {
      network.value.setOptions({ physics: { enabled: true } });
      network.value.once('stabilizationIterationsDone', () => {
        setTimeout(() => {
          if (network && network.value) {
            network.value.fit({ animation: false });
          }
        }, 100);
      });
    } else {
      setTimeout(() => {
        if (network && network.value) {
          network.value.setOptions({ physics: { enabled: false } });
          network.value.stopSimulation();
          network.value.fit({ animation: false });
        }
      }, 100);
    }

    if (interactionMode.value === 'addEdge') {
      network.value.addEdgeMode();
    }
  }

  // Save node positions
  function saveNodePositions(diagramId, manualPositions = null) {
    if (!diagramId) return;
    try {
      let positions = {};

      if (network.value) {
        const nodePositions = network.value.getPositions();
        Object.keys(nodePositions).forEach(nodeId => {
          positions[nodeId] = nodePositions[nodeId];
        });
      }

      if (manualPositions) {
        positions = { ...positions, ...manualPositions };
      }

      diagramPositions.value[diagramId] = positions;
      localStorage.setItem(`cld-positions-${diagramId}`, JSON.stringify(positions));
    } catch (error) {
      console.error('Error saving node positions:', error);
    }
  }

  // Load node positions
  function getSavedPositions(diagramId) {
    if (!diagramId) return null;
    try {
      if (diagramPositions.value[diagramId]) return diagramPositions.value[diagramId];
      const saved = localStorage.getItem(`cld-positions-${diagramId}`);
      if (saved) {
        const positions = JSON.parse(saved);
        diagramPositions.value[diagramId] = positions;
        return positions;
      }
    } catch (error) { console.error('Error getting saved positions:', error); }
    return null;
  }

  // Node selection → popup info (uses archetypeMetaById)
  function handleNodeSelection(params, diagram) {
    const nodeId = params.nodes[0];
    selectedNode.value = nodeId;

    const node = (diagram.nodes || []).find(n => n.id === nodeId);
    if (!node) return;

    const rawLoops = (diagram.feedback_loops || []).filter(loop =>
      Array.isArray(loop.variables) &&
      loop.variables.some(v => (typeof v === 'object' ? v.id === nodeId : v === nodeId))
    );

    const uniqueLoopsMap = new Map();
    rawLoops.forEach(loop => {
        const varSignature = (loop.variables || []).map(v => typeof v === 'object' ? v.id : String(v)).sort().join('|');
        const key = loop.id ? loop.id : `${loop.type}-${varSignature}`;
        uniqueLoopsMap.set(key, loop);
    });
    const filteredLoops = Array.from(uniqueLoopsMap.values());

    const rawArchetypes = (diagram.archetypes || []).filter(arch =>
      Array.isArray(arch.variables) &&
      arch.variables.some(v => (typeof v === 'object' ? v.id === nodeId : v === nodeId))
    );

    const uniqueArchMap = new Map();
    rawArchetypes.forEach(arch => {
        const varSignature = (arch.variables || []).map(v => typeof v === 'object' ? v.id : String(v)).sort().join('|');
        const key = arch.id ? arch.id : `${arch.type}-${varSignature}`;
        uniqueArchMap.set(key, arch);
    });
    const filteredArchetypes = Array.from(uniqueArchMap.values());

    const getVariableName = (varId) => {
      const foundVar = (diagram.nodes || []).find(n => n.id === varId);
      return foundVar ? foundVar.name : varId;
    };

    selectedNodeInfo.value = {
      nodeName: node.name,
      loops: filteredLoops.map(loop => ({
        id: loop.id,
        type: loop.type,
        color: getLoopColor(loop.type),
        variables: Array.isArray(loop.variables)
          ? loop.variables.map(v => {
              if (typeof v === 'object' && v.name) return v.name;
              if (typeof v === 'object' && v.id)   return getVariableName(v.id);
              return getVariableName(v);
            })
          : []
      })),
      archetypes: filteredArchetypes.map(arch => {
        const meta = archetypeMetaById.get(arch.id);
        return {
          id: arch.id,
          type: arch.type,
          color: meta?.color || getArchetypeColor(arch.type),
          label: meta?.label || formatArchetypeName(arch.type),
          variables: Array.isArray(arch.variables)
            ? arch.variables.map(v => {
                if (typeof v === 'object' && v.name) return v.name;
                if (typeof v === 'object' && v.id)   return getVariableName(v.id);
                return getVariableName(v);
              })
            : []
        };
      })
    };
  }

  function clearNodeSelection() {
    if (network.value) {
      try {
        network.value.unselectAll();
      } catch (e) {
        console.error('Erro ao limpar seleção do network:', e);
      }
    }

    selectedNode.value = null;
    selectedNodeInfo.value = { nodeName: '', loops: [], archetypes: [] };
  }

  function zoomIn() {
    if (!network.value) return;
    zoomLevel.value += 0.1;
    network.value.moveTo({ scale: zoomLevel.value });
  }

  function zoomOut() {
    if (!network.value || zoomLevel.value <= 0.2) return;
    zoomLevel.value -= 0.1;
    network.value.moveTo({ scale: zoomLevel.value });
  }

  // Keep nodes from overlapping too much
  function ensureNoOverlap() {
    if (!network.value) return;
    const positions = network.value.getPositions();
    const nodeIds = Object.keys(positions);
    const nodeCount = nodeIds.length;
    if (nodeCount <= 1) return;

    let overlapsFixed = 0;
    let minDistance = 120;
    if (nodeCount > 10) minDistance = 150;
    if (nodeCount > 20) minDistance = 180;
    if (nodeCount > 30) minDistance = 200;

    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        const id1 = nodeIds[i];
        const id2 = nodeIds[j];
        const pos1 = positions[id1];
        const pos2 = positions[id2];
        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < minDistance) {
          overlapsFixed++;
          const angle = Math.atan2(dy, dx);
          const move = (minDistance - distance) / 2;
          const newPos1 = { x: pos1.x - Math.cos(angle) * move, y: pos1.y - Math.sin(angle) * move };
          const newPos2 = { x: pos2.x + Math.cos(angle) * move, y: pos2.y + Math.sin(angle) * move };
          network.value.moveNode(id1, newPos1.x, newPos1.y);
          network.value.moveNode(id2, newPos2.x, newPos2.y);
          positions[id1] = newPos1;
          positions[id2] = newPos2;
        }
      }
    }

    if (overlapsFixed > 0) {
      if (network && network.value) {
        network.value.fit({animation: {duration: 500, easingFunction: 'easeOutQuad'}});
      }
    }
  }

  function redistributeNodes() {
    if (!network.value) return;
    const nodeIds = network.value.getNodeIds();
    const nodeCount = nodeIds.length;
    if (nodeCount <= 1) return;

    network.value.setOptions({ physics: { enabled: true } });

    if (nodeCount <= 10) {
      const radius = Math.max(300, nodeCount * 50);
      const step = (2 * Math.PI) / nodeCount;
      nodeIds.forEach((id, i) => {
        network.value.moveNode(id, radius * Math.cos(i * step), radius * Math.sin(i * step));
      });
    } else {
      const grid = Math.ceil(Math.sqrt(nodeCount));
      const sx = 200, sy = 200;
      nodeIds.forEach((id, i) => {
        const row = Math.floor(i / grid), col = i % grid;
        const ox = -((grid - 1) * sx) / 2, oy = -((grid - 1) * sy) / 2;
        network.value.moveNode(id, ox + col * sx, oy + row * sy);
      });
    }

    setTimeout(() => {
      ensureNoOverlap();
      if (network && network.value) {
        network.value.setOptions({ physics: { enabled: false } });
        network.value.fit({ animation: { duration: 1000, easingFunction: 'easeInOutQuad' } });
      }
    }, 1500);
  }

  function getArchetypeIcon(type) {
    const iconMap = {
      'BALANCING_PROCESS_WITH_DELAY': 'fa-clock',
      'LIMITS_TO_GROWTH': 'fa-chart-line',
      'SHIFTING_THE_BURDEN': 'fa-weight-hanging',
      'TRAGEDY_OF_THE_COMMONS': 'fa-users',
      'FIXES_THAT_FAIL': 'fa-tools',
      'GROWTH_AND_UNDERINVESTMENT': 'fa-chart-bar',
      'SUCCESS_TO_THE_SUCCESSFUL': 'fa-trophy',
      'ERODING_GOALS': 'fa-bullseye',
      'ESCALATION': 'fa-level-up-alt',
      'ACCIDENTAL_ADVERSARIES': 'fa-angry'
    };
    return iconMap[type] || 'fa-question-circle';
  }

  function formatArchetypeName(name) {
    return String(name || '')
      .replace(/_/g, ' ')
      .replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
  }

  function fitView() {
    if (!network.value) return;
    network.value.fit({ animation: { duration: 1000, easingFunction: 'easeInOutQuad' } });
  }

  function setInteractionMode(mode) {
    interactionMode.value = mode;
    if (!network.value) return;

    network.value.disableEditMode();

    if (mode === 'pan') {

      network.value.setOptions({
        interaction: { dragNodes: false, selectable: false }
      });
      clearNodeSelection();
    } else if (mode === 'addPositiveEdge' || mode === 'addNegativeEdge') {
      const isPositive = mode === 'addPositiveEdge';
      const c = isPositive ? EDGE_COLORS.positive : EDGE_COLORS.negative;
      network.value.setOptions({
        interaction: { dragNodes: false, selectable: false },
        edges: {
          arrows: 'to',
          color: {
            inherit: false,
            color: c.base,
            highlight: c.base,
            hover: c.base
          }
        },
        manipulation: {
          controlNodeStyle: {
            shape: 'dot',
            size: 6,
            color: {
              background: c.base,
              border: c.base,
              highlight: { background: c.base, border: c.base }
            }
          }
        }
      });
      clearNodeSelection();
      network.value.addEdgeMode();
    } else {
      network.value.setOptions({
        interaction: { dragNodes: true, selectable: true }
      });
    }
  }

  function addEdgeToCanvas(edgeData) {
    if (!network.value) return;
    const isPositive = edgeData.polarity === 'positive';
    const c = isPositive ? EDGE_COLORS.positive : EDGE_COLORS.negative;

    network.value.body.data.edges.add({
      id: edgeData.id,
      from: edgeData.source,
      to: edgeData.target,
      label: isPositive ? '+' : '-',
      arrows: 'to',
      font: { size: 22, color: c.base },
      width: 2,
      color: { color: c.base, highlight: c.highlight }
    });
  }

  function deleteSelectedElements(removeNodeCb, removeEdgeCb) {
    if (!network.value) return;

    const selection = network.value.getSelection();

    if (selection.nodes.length > 0) {
      selection.nodes.forEach(nodeId => {
        const connectedEdgeIds = network.value.getConnectedEdges(nodeId);
        const visEdges = connectedEdgeIds.map(id => network.value.body.data.edges.get(id));

        if (removeNodeCb) removeNodeCb(nodeId, visEdges);
      });
    } else if (selection.edges.length > 0) {
      selection.edges.forEach(edgeId => {
        const visEdge = network.value.body.data.edges.get(edgeId);

        if (removeEdgeCb) removeEdgeCb(edgeId, visEdge);
      });
    }

    clearNodeSelection();
    hasSelection.value = false;
  }

  function getCurrentPositions() {
    if (!network.value) return {};
    return network.value.getPositions();
  }

  function updateNodePosition(nodeId, x, y) {
    if (!network.value) return;
    try {
        network.value.moveNode(nodeId, x, y);
    } catch (e) {
    }
  }

  function addNodeToCanvas(nodeData) {
    if (!network.value) return;
    try {
        const bgColor = (typeof NODE_COLORS !== 'undefined' && NODE_COLORS.regular) ? NODE_COLORS.regular.background : '#FDE5A6';
        const borderColor = (typeof NODE_COLORS !== 'undefined' && NODE_COLORS.regular) ? NODE_COLORS.regular.border : '#D8C28D';

        const nodeObj = {
            id: nodeData.id,
            label: wrapLabel(nodeData.name, 30, 3),
            shape: 'ellipse',
            font: { size: 18, color: '#000000', face: 'Arial', multi: true },
            borderWidth: 2,
            widthConstraint: { maximum: 200 },
            title: nodeData.name,
            color: {
                background: bgColor,
                border: borderColor,
                highlight: { background: bgColor, border: borderColor }
            }
        };

        if (nodeData.x !== undefined && nodeData.y !== undefined) {
            nodeObj.x = Number(nodeData.x);
            nodeObj.y = Number(nodeData.y);
        }

        network.value.body.data.nodes.add(nodeObj);

        if (nodeData.x !== undefined && nodeData.y !== undefined) {
            network.value.moveNode(nodeObj.id, Number(nodeData.x), Number(nodeData.y));
        }
    } catch (e) {
        console.warn('Node já existe ou erro ao adicionar:', e);
    }
  }

  function removeNodeFromCanvas(nodeId) {
      if (!network.value) return;
      try {
        network.value.body.data.nodes.remove(nodeId);
      } catch(e){
        console.log(e);
      }
  }

  function removeEdgeFromCanvas(edgeId, source, target) {
      if (!network.value) return;
      try {
          if (network.value.body.data.edges.get(edgeId)) {
              network.value.body.data.edges.remove(edgeId);
              return;
          } else if (network.value.body.data.edges.get(String(edgeId))) {
              network.value.body.data.edges.remove(String(edgeId));
              return;
          }

          if (source && target) {
              const allEdges = network.value.body.data.edges.get();
              const visualEdge = allEdges.find(e =>
                  String(e.from) === String(source) && String(e.to) === String(target)
              );

              if (visualEdge) {
                  network.value.body.data.edges.remove(visualEdge.id);
              }
          }
      } catch(e) { console.warn(e); }
  }

  function exportToPNG(filename = 'diagrama_cld.png') {
    if (!networkContainer.value) return;

    const canvas = networkContainer.value.querySelector('canvas');
    if (!canvas) {
      console.warn('Canvas não encontrado para exportação.');
      return;
    }

    const imageURL = canvas.toDataURL('image/png');

    const downloadLink = document.createElement('a');
    downloadLink.href = imageURL;
    downloadLink.download = filename;

    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  }

  return {
    networkContainer,
    network,
    selectedNodeInfo,
    selectedNode,
    legendArchetypes,
    createDiagram,
    clearNodeSelection,
    zoomIn,
    zoomOut,
    redistributeNodes,
    getArchetypeIcon,
    formatArchetypeName,
    saveNodePositions,
    interactionMode,
    setInteractionMode,
    fitView,
    edgeAddedCallback,
    addEdgeToCanvas,
    hasSelection,
    deleteSelectedElements,
    getCurrentPositions,
    updateNodePosition,
    nodeDraggedCallback,
    addNodeToCanvas,
    removeEdgeFromCanvas,
    removeNodeFromCanvas,
    exportToPNG
  };
}
