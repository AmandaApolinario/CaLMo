import { ref, computed } from 'vue';
import CLDService from '@/services/cld.service';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';
import {
  NODE_COLORS,
  EDGE_COLORS,
  getArchetypeColor,
  getLoopColor,
} from '@/theme/colors';
import { makePieEllipseDataUrl } from '@/theme/nodeImages';

export function useCLDDiagramViewModel() {
  const networkContainer = ref(null);
  const network = ref(null);
  const zoomLevel = ref(1);
  const selectedNode = ref(null);
  const selectedNodeInfo = ref({
    nodeName: '',
    loops: [],
    archetypes: []
  });
  
  // Store positions for each diagram
  const diagramPositions = ref({});

  function createDiagram(diagram, container) {
    if (!container || !diagram) return;
    
    networkContainer.value = container;
    
    // Get all variable IDs that are part of archetypes
    const archetypeVariableIds = new Set();
    if (diagram.archetypes && diagram.archetypes.length > 0) {
      diagram.archetypes.forEach(archetype => {
        archetype.variables.forEach(variableId => {
          archetypeVariableIds.add(variableId);
        });
      });
    }

    // Get saved positions for this diagram
    const savedPositions = getSavedPositions(diagram.id);

    // nodeId -> array of archetype types (in diagram order)
    const archetypeTypesByNode = new Map();
    if (diagram.archetypes?.length) {
      diagram.archetypes.forEach(arch => {
        (arch.variables || []).forEach(v => {
          const id = typeof v === 'object' ? v.id : v;
          if (id == null) return;
          if (!archetypeTypesByNode.has(id)) archetypeTypesByNode.set(id, []);
          archetypeTypesByNode.get(id).push(arch.type);
        });
      });
    }

    // Create nodes
    const nodes = new DataSet(
      diagram.nodes.map(node => {
        // Default node properties
        const nodeObj = {
          id: node.id,
          label: node.name,
          shape: 'ellipse',
          font: { size: 18, color: '#000000', face: 'Arial' },
          borderWidth: 2
        };
        
        // Apply saved position if available
        if (savedPositions && savedPositions[node.id]) {
          nodeObj.x = savedPositions[node.id].x;
          nodeObj.y = savedPositions[node.id].y;
        }


        // === Node visual ===
        const types = archetypeTypesByNode.get(node.id) || [];

        // 2+ archetypes → pie-ellipse image with equal slices
        if (types.length >= 2) {
          const colors = [...new Set(types)].map(t => getArchetypeColor(t)); // dedupe, map to HEX
          nodeObj.shape = 'image';
          nodeObj.image = makePieEllipseDataUrl({
            label: node.name,
            colors
          });
          nodeObj.label = '';   // label is drawn inside the SVG
          nodeObj.shadow = true;
        }
        // exactly 1 archetype → solid ellipse in that archetype color
        else if (types.length === 1) {
          const c = getArchetypeColor(types[0]);
          nodeObj.shape = 'ellipse';
          nodeObj.color = {
            background: c, // archetype color
            border: c,     // archetype color
            highlight: { background: c, border: c }
          };
        }
        // no archetype → your regular palette
        else {
          nodeObj.shape = 'ellipse';
          nodeObj.color = {
            background: NODE_COLORS.regular.background,            // CREAM
            border: NODE_COLORS.regular.border,                    // CREAM
            highlight: {
              background: NODE_COLORS.regular.highlightBackground, // GOLDENROD
              border: NODE_COLORS.regular.highlightBorder          // GOLDENROD
            }
          };
        }


        return nodeObj;
      })
    );

    // Create edges
    const edges = new DataSet(
      diagram.edges.map(edge => {
        const isPositive = edge.polarity === 'positive';
        const c = isPositive ? EDGE_COLORS.positive : EDGE_COLORS.negative;
        return {
          id: edge.id,
          from: edge.source,
          to: edge.target,
          label: isPositive ? '+' : '-',
          arrows: 'to',
          font: { size: 22, color: c.base }, // GREEN or RED
          width: 2,
          color: {
            color: c.base,        // GREEN or RED
            highlight: c.highlight // LIGHT GREEN or LIGHT RED
          }
        };
      })
    );


    // Network options
    const options = {
      nodes: {
        shape: 'ellipse',
        shadow: true,
        borderWidth: 2,
        margin: 10,
        scaling: {
          label: { enabled: true }
        },
        fixed: {
          x: false,
          y: false
        }
      },
      edges: {
        smooth: {
          type: 'curvedCW',
          roundness: 0.2
        },
        width: 2
      },
      interaction: {
        hover: true,
        navigationButtons: true,
        keyboard: true,
        multiselect: false,
        dragNodes: true,
        zoomView: true
      },
      physics: {
        enabled: false, // Disable physics to prevent spinning
        stabilization: {
          enabled: true,
          iterations: 100, // Reduced for faster stabilization
          fit: true
        },
        barnesHut: {
          gravitationalConstant: -2000,
          centralGravity: 0.05, // Reduced to prevent center pull
          springLength: 150,
          springConstant: 0.04,
          damping: 0.5, // Increased damping to prevent oscillations
          avoidOverlap: 1.0
        }
      },
      layout: {
        improvedLayout: true,
        randomSeed: 42 // Fixed seed for consistent layouts
      }
    };

    // Create network
    network.value = new Network(
      networkContainer.value,
      { nodes, edges },
      options
    );

    // Handle node selection
    network.value.on('selectNode', (params) => {
      handleNodeSelection(params, diagram);
    });

    // Handle click outside nodes
    network.value.on('click', (params) => {
      if (params.nodes.length === 0) {
        clearNodeSelection();
      }
    });
    
    // Save positions when nodes are dragged
    network.value.on('dragEnd', () => {
      saveNodePositions(diagram.id);
    });
    
    // Fit to view once loaded - show entire diagram
    setTimeout(() => {
      network.value.fit({
        animation: {
          duration: 1000,
          easingFunction: 'easeInOutQuad'
        }
      });
    }, 500);
    
    // For diagrams without saved positions, run stabilization once to position nodes, then disable physics
    if (!savedPositions) {
      // Temporarily enable physics for initial layout
      network.value.setOptions({ physics: { enabled: true } });
      
      // After stabilization completes, disable physics to stop movement
      network.value.once('stabilizationIterationsDone', () => {
        setTimeout(() => {
          ensureNoOverlap();
          network.value.setOptions({ physics: { enabled: false } });
          // Explicitly stop animation
          network.value.stopSimulation();
          // Fit to view to ensure all nodes are visible
          network.value.fit({
            animation: {
              duration: 1000,
              easingFunction: 'easeInOutQuad'
            }
          });
          saveNodePositions(diagram.id);
        }, 500);
      });
    } else {
      // If we have saved positions, quickly check for overlaps and ensure diagram is static
      setTimeout(() => {
        ensureNoOverlap();
        // Make sure physics remains disabled
        network.value.setOptions({ physics: { enabled: false } });
        // Explicitly stop any ongoing simulation
        network.value.stopSimulation();
        // Fit to view to ensure all nodes are visible
        network.value.fit();
      }, 100);
    }
  }
  
  // Save current node positions to localStorage
  function saveNodePositions(diagramId) {
    if (!network.value || !diagramId) return;
    
    try {
      const positions = {};
      const nodePositions = network.value.getPositions();
      
      Object.keys(nodePositions).forEach(nodeId => {
        positions[nodeId] = nodePositions[nodeId];
      });
      
      // Update the reactive state
      diagramPositions.value[diagramId] = positions;
      
      // Save to localStorage for persistence between sessions
      localStorage.setItem(`cld-positions-${diagramId}`, JSON.stringify(positions));
      console.log('Node positions saved for diagram:', diagramId);
    } catch (error) {
      console.error('Error saving node positions:', error);
    }
  }
  
  // Get saved positions from localStorage
  function getSavedPositions(diagramId) {
    if (!diagramId) return null;
    
    try {
      // First check our reactive state
      if (diagramPositions.value[diagramId]) {
        return diagramPositions.value[diagramId];
      }
      
      // Then check localStorage
      const savedPositions = localStorage.getItem(`cld-positions-${diagramId}`);
      if (savedPositions) {
        const positions = JSON.parse(savedPositions);
        diagramPositions.value[diagramId] = positions;
        return positions;
      }
    } catch (error) {
      console.error('Error getting saved positions:', error);
    }
    
    return null;
  }

  function handleNodeSelection(params, diagram) {
    const nodeId = params.nodes[0];
    selectedNode.value = nodeId;
    
    const node = diagram.nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    // Find loops containing this node
    const loops = diagram.feedback_loops ? diagram.feedback_loops.filter(loop => {
      // Handle different ways loops can store variables
      if (Array.isArray(loop.variables)) {
        return loop.variables.some(v => {
          // Variables can be objects with id, or just id strings
          return typeof v === 'object' ? v.id === nodeId : v === nodeId;
        });
      }
      return false;
    }) : [];
    
    // Find archetypes containing this node
    const archetypes = diagram.archetypes ? diagram.archetypes.filter(arch => {
      // Handle different ways archetypes can store variables
      if (Array.isArray(arch.variables)) {
        return arch.variables.some(v => {
          // Variables can be objects with id, or just id strings
          return typeof v === 'object' ? v.id === nodeId : v === nodeId;
        });
      }
      return false;
    }) : [];
    
    console.log('Selected Node Info:', {
      nodeId,
      nodeName: node.name,
      loops,
      archetypes
    });
    
    // Helper function to get variable name from id
    const getVariableName = (varId) => {
      const foundVar = diagram.nodes.find(n => n.id === varId);
      return foundVar ? foundVar.name : varId;
    };
    
    selectedNodeInfo.value = {
      nodeName: node.name,
      loops: (loops || []).map(loop => ({
        id: loop.id,
        type: loop.type,
        color: getLoopColor(loop.type), // loop color for badges
        variables: Array.isArray(loop.variables) ? loop.variables.map(v => {
          if (typeof v === 'object' && v.name) return v.name;
          if (typeof v === 'object' && v.id)   return getVariableName(v.id);
          return getVariableName(v);
        }) : []
      })),
      archetypes: (archetypes || []).map(arch => ({
        id: arch.id,
        type: arch.type,
        color: getArchetypeColor(arch.type) || '#7F8C8D', // GRAY fallback
        variables: Array.isArray(arch.variables) ? arch.variables.map(v => {
          if (typeof v === 'object' && v.name) return v.name;
          if (typeof v === 'object' && v.id)   return getVariableName(v.id);
          return getVariableName(v);
        }) : []
      }))
    };
  }

  function clearNodeSelection() {
    selectedNode.value = null;
    selectedNodeInfo.value = {
      nodeName: '',
      loops: [],
      archetypes: []
    };
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
    return name.replace(/_/g, ' ').replace(/\w\S*/g, txt => {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  }

  // Function to check for and resolve node overlaps
  function ensureNoOverlap() {
    if (!network.value) return;
    
    // Get all node positions
    const positions = network.value.getPositions();
    const nodeIds = Object.keys(positions);
    const nodeCount = nodeIds.length;
    
    if (nodeCount <= 1) return; // No need to check if only one node
    
    // Get node boundaries (using getBoundingBox)
    const nodeBounds = {};
    for (const id of nodeIds) {
      nodeBounds[id] = network.value.getBoundingBox(id);
    }
    
    let overlapsFixed = 0;
    
    // Dynamically adjust minimum distance based on number of nodes
    // For more nodes, we need more spacing to prevent overlaps
    let minDistance = 120; // Base minimum distance
    
    // Increase spacing for diagrams with many nodes
    if (nodeCount > 10) {
      minDistance = 150;
    }
    if (nodeCount > 20) {
      minDistance = 180;
    }
    if (nodeCount > 30) {
      minDistance = 200;
    }
    
    console.log(`Using minimum distance of ${minDistance}px for ${nodeCount} nodes`);
    
    // Check each pair of nodes for overlap
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        const id1 = nodeIds[i];
        const id2 = nodeIds[j];
        const pos1 = positions[id1];
        const pos2 = positions[id2];
        
        // Calculate distance between nodes
        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If nodes are too close, move them apart
        if (distance < minDistance) {
          overlapsFixed++;
          
          // Direction vector
          const angle = Math.atan2(dy, dx);
          
          // Move distance/2 in opposite directions
          const moveDistance = (minDistance - distance) / 2;
          
          // Move node 1 away from node 2
          const newPos1 = {
            x: pos1.x - Math.cos(angle) * moveDistance,
            y: pos1.y - Math.sin(angle) * moveDistance
          };
          
          // Move node 2 away from node 1
          const newPos2 = {
            x: pos2.x + Math.cos(angle) * moveDistance,
            y: pos2.y + Math.sin(angle) * moveDistance
          };
          
          // Update network positions
          network.value.moveNode(id1, newPos1.x, newPos1.y);
          network.value.moveNode(id2, newPos2.x, newPos2.y);
          
          // Update our local cache
          positions[id1] = newPos1;
          positions[id2] = newPos2;
        }
      }
    }
    
    if (overlapsFixed > 0) {
      console.log(`Fixed ${overlapsFixed} node overlaps`);
      
      // After fixing overlaps, make sure the diagram fits in the view
      network.value.fit({
        animation: {
          duration: 500,
          easingFunction: 'easeOutQuad'
        }
      });
    }
  }

  // Function to redistribute nodes in a more organized manner
  function redistributeNodes() {
    if (!network.value) return;
    
    const nodeIds = network.value.getNodeIds();
    const nodeCount = nodeIds.length;
    
    if (nodeCount <= 1) return;
    
    console.log('Redistributing nodes for better visibility');
    
    // Temporarily enable physics for better layout
    network.value.setOptions({ physics: { enabled: true } });
    
    // Spread nodes out in a circle or grid layout
    if (nodeCount <= 10) {
      // For fewer nodes, use a circle layout
      const radius = Math.max(300, nodeCount * 50);
      const angleStep = (2 * Math.PI) / nodeCount;
      
      nodeIds.forEach((id, index) => {
        const angle = index * angleStep;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        network.value.moveNode(id, x, y);
      });
    } else {
      // For more nodes, use a grid layout
      // Calculate grid dimensions based on square root of node count
      const gridSize = Math.ceil(Math.sqrt(nodeCount));
      const spacingX = 200;
      const spacingY = 200;
      
      nodeIds.forEach((id, index) => {
        const row = Math.floor(index / gridSize);
        const col = index % gridSize;
        
        // Center the grid
        const offsetX = -((gridSize - 1) * spacingX) / 2;
        const offsetY = -((gridSize - 1) * spacingY) / 2;
        
        const x = offsetX + col * spacingX;
        const y = offsetY + row * spacingY;
        
        network.value.moveNode(id, x, y);
      });
    }
    
    // Run stabilization briefly
    setTimeout(() => {
      // Ensure no overlaps
      ensureNoOverlap();
      
      // Disable physics again
      network.value.setOptions({ physics: { enabled: false } });
      
      // Fit the network to the view
      network.value.fit({
        animation: {
          duration: 1000,
          easingFunction: 'easeInOutQuad'
        }
      });
      
      // Save the new node positions
      if (diagram.value && diagram.value.id) {
        saveNodePositions(diagram.value.id);
      }
    }, 1500);
  }

  return {
    networkContainer,
    selectedNodeInfo,
    selectedNode,
    createDiagram,
    clearNodeSelection,
    zoomIn,
    zoomOut,
    redistributeNodes,
    getArchetypeIcon,
    formatArchetypeName
  };
} 