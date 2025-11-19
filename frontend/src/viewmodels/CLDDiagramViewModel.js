import { ref } from 'vue';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';
import {
  NODE_COLORS,
  EDGE_COLORS,
  getArchetypeColor,
  getLoopColor,
  getArchetypeInstanceColor,
  ensureContrastWithBackground, // ensure instance color is not too close to node regular color
} from '@/theme/colors';
import { makePieEllipseDataUrl } from '@/theme/nodeImages';

export function useCLDDiagramViewModel() {
  const networkContainer = ref(null);
  const network = ref(null);
  const zoomLevel = ref(1);
  const selectedNode = ref(null);
  const selectedNodeInfo = ref({ nodeName: '', loops: [], archetypes: [] });

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

    (diagram.archetypes || []).forEach((arch) => {
      const t = arch.type;
      const idx = typeIndices.get(t) || 0;
      typeIndices.set(t, idx + 1);

      // Base instance color then ensure it's distinct from regular node color
      const total = typeTotals.get(t) || 1;
      const color = getArchetypeInstanceColor(t, idx, total);

      // Label: if only one instance of this type, omit numbering; else use Roman numerals
      const label =
        total === 1 ? formatArchetypeName(t) : `${formatArchetypeName(t)} ${toRoman(idx + 1)}`;

      archetypeMetaById.set(arch.id, { type: t, index: idx, color, label });

      (arch.variables || []).forEach((v) => {
        const id = typeof v === 'object' ? v.id : v;
        if (id == null) return;
        if (!archetypeIdsByNode.has(id)) archetypeIdsByNode.set(id, []);
        archetypeIdsByNode.get(id).push(arch.id);
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
        const wrapped = wrapLabel(node.name, 20, 3);

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
        }

        const archIds = archetypeIdsByNode.get(node.id) || [];

        if (archIds.length >= 2) {
          const colors = [...new Set(
            archIds.map(id => archetypeMetaById.get(id)?.color).filter(Boolean)
          )];
          nodeObj.shape = 'image';
          nodeObj.image = makePieEllipseDataUrl({ label: wrapped, colors });
          nodeObj.label = '';
          nodeObj.shadow = true;

        } else if (archIds.length === 1) {
          const meta = archetypeMetaById.get(archIds[0]);
          const c = meta?.color || getArchetypeColor(meta?.type);
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
          useImageSize: true,       // usa width/height do SVG
          useBorderWithImage: false  // mantém a borda do nó com imagem
        }
      },
      edges: { smooth: { type: 'curvedCW', roundness: 0.2 },
        width: 2
      },
      interaction: {
        hover: true, navigationButtons: true, keyboard: true,
        multiselect: false, dragNodes: true, zoomView: true
      },
      physics: {
        enabled: false,
        stabilization: { enabled: true, iterations: 100, fit: true },
        barnesHut: {
          gravitationalConstant: -2000, centralGravity: 0.05,
          springLength: 150, springConstant: 0.04,
          damping: 0.5, avoidOverlap: 1.0
        }
      },
      layout: { improvedLayout: true, randomSeed: 42 }
    };

    // ---- Create network ----
    network.value = new Network(networkContainer.value, { nodes, edges }, options);

    // Selection & UX
    network.value.on('selectNode', (params) => handleNodeSelection(params, diagram));
    network.value.on('click', (params) => {
      if (params.nodes.length === 0) {
        clearNodeSelection();
      } else {
        handleNodeSelection({ nodes: params.nodes }, diagram);
      }
    });
    network.value.on('dragEnd', () => saveNodePositions(diagram.id));

    setTimeout(() => {
      network.value.fit({ animation: { duration: 1000, easingFunction: 'easeInOutQuad' } });
    }, 500);

    if (!savedPositions) {
      network.value.setOptions({ physics: { enabled: true } });
      network.value.once('stabilizationIterationsDone', () => {
        setTimeout(() => {
          ensureNoOverlap();
          network.value.setOptions({ physics: { enabled: false } });
          network.value.stopSimulation();
          network.value.fit({ animation: { duration: 1000, easingFunction: 'easeInOutQuad' } });
          saveNodePositions(diagram.id);
        }, 500);
      });
    } else {
      setTimeout(() => {
        ensureNoOverlap();
        network.value.setOptions({ physics: { enabled: false } });
        network.value.stopSimulation();
        network.value.fit();
      }, 100);
    }
  }

  // Save node positions
  function saveNodePositions(diagramId) {
    if (!network.value || !diagramId) return;
    try {
      const positions = {};
      const nodePositions = network.value.getPositions();
      Object.keys(nodePositions).forEach(nodeId => { positions[nodeId] = nodePositions[nodeId]; });
      diagramPositions.value[diagramId] = positions;
      localStorage.setItem(`cld-positions-${diagramId}`, JSON.stringify(positions));
    } catch (error) { console.error('Error saving node positions:', error); }
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

    const loops = (diagram.feedback_loops || []).filter(loop =>
      Array.isArray(loop.variables) &&
      loop.variables.some(v => (typeof v === 'object' ? v.id === nodeId : v === nodeId))
    );

    const archetypes = (diagram.archetypes || []).filter(arch =>
      Array.isArray(arch.variables) &&
      arch.variables.some(v => (typeof v === 'object' ? v.id === nodeId : v === nodeId))
    );

    const getVariableName = (varId) => {
      const foundVar = (diagram.nodes || []).find(n => n.id === varId);
      return foundVar ? foundVar.name : varId;
    };

    selectedNodeInfo.value = {
      nodeName: node.name,
      loops: (loops || []).map(loop => ({
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
      archetypes: (archetypes || []).map(arch => {
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
      network.value.fit({ animation: { duration: 500, easingFunction: 'easeOutQuad' } });
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
      network.value.setOptions({ physics: { enabled: false } });
      network.value.fit({ animation: { duration: 1000, easingFunction: 'easeInOutQuad' } });
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

  return {
    networkContainer,
    selectedNodeInfo,
    selectedNode,
    legendArchetypes,
    createDiagram,
    clearNodeSelection,
    zoomIn,
    zoomOut,
    redistributeNodes,
    getArchetypeIcon,
    formatArchetypeName
  };
}
