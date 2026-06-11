import { ref, computed, onMounted, reactive } from 'vue';
import ApiService from '@/services/api.service';
import CLDService from '@/services/cld.service';
import { webSocketService } from '@/services/websocket.service';
import {publishDiagramEvent} from "@/services/kafkaEvent.service.js";

export function useCLDCanvasViewModel() {
    const variables = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const shapes = ref([]);
    const showCreateModal = ref(false);
    const creatingVariable = ref(false);

    const diagram = ref(null);
    const nodes = ref([]);
    const edges = ref([]);
    const selectedNode = ref(null);
    const selectedNodeInfo = ref({ nodeName: '', subsystemIds: [], loops: [], archetypes: [] });
    const selectedEdge = ref(null);
    const isLoadingDiagram = ref(false);
    const clientId = ref(crypto.randomUUID());
    const undoStack = ref([]);
    const redoStack = ref([]);
    const showShareModal = ref(false);
    const currentShareToken = ref(null);
    const isGeneratingLink = ref(false);
    const provideStateCallback = ref(null);
    const applyStateCallback = ref(null);
    const remoteNodeMovedCallback = ref(null);
    const remoteNodeAddedCallback = ref(null);
    const remoteNodeRemovedCallback = ref(null);
    const remoteEdgeAddedCallback = ref(null);
    const remoteEdgeRemovedCallback = ref(null);
    const diagramNameRef = ref(null);
    const lastSaveStackSize = ref(0);
    const hasUnsavedChanges = computed(() => {
        return undoStack.value.length > lastSaveStackSize.value;
    });
    const historyList = ref([]);
    const isHistoryModalOpen = ref(false);
    const isLoadingHistory = ref(false);
    const pendingChanges = ref([]);

    const isInfoModalOpen = ref(false);


    const newVariable = reactive({
        name: '',
        description: ''
    });

    const fetchVariables = async (diagramId = null, shareToken = null) => {
        loading.value = true;
        error.value = null;

        try {
            let response;

            if (shareToken) {
                response = await ApiService.get(`cld/shared/ownerVariables?token=${shareToken}`);
            } else {
                response = await ApiService.get('variables');
            }

            variables.value = response.data || [];
        } catch (err) {
            console.error('Error fetching variables:', err);
        } finally {
            loading.value = false;
        }
    };

    const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const addShape = (variable, x, y) => {
        const rectWidth = 150;
        const rectHeight = 50;

        shapes.value.push({
            id: generateId(),
            variableName: variable.name,
            variableId: variable.id,
            config: {
                x: Math.max(0, x - rectWidth / 2),
                y: Math.max(0, y - rectHeight / 2),
                width: rectWidth,
                height: rectHeight,
                fill: '#3498db',
                stroke: '#2980b9',
            },
        });
    };

    const updateShapePosition = (shapeId, x, y, stageWidth, stageHeight) => {
        const shape = shapes.value.find((s) => s.id === shapeId);
        if (shape) {
            const width = shape.config.width;
            const height = shape.config.height;

            shape.config.x = Math.max(0, Math.min(x, stageWidth - width));
            shape.config.y = Math.max(0, Math.min(y, stageHeight - height));

            return shape;
        }
    };

    const removeShape = (shapeId) => {
        const index = shapes.value.findIndex((s) => s.id === shapeId);
        if (index > -1) {
            shapes.value.splice(index, 1);
        }
    };

    const getShapeById = (shapeId) => {
        return shapes.value.find((s) => s.id === shapeId);
    };

    const createVariable = async (shareToken = null) => {
        if (!newVariable.name.trim()) {
            return false;
        }

        creatingVariable.value = true;
        error.value = null;

        const payload = {
            name: newVariable.name.trim(),
            description: newVariable.description.trim()
        }

        if (shareToken) {
           payload.shareToken = shareToken;
        }
        try {
            const response = await ApiService.post('variable', payload);
            const newVariable = response.data;
            resetVariableForm();
             if (diagram.value) {
                publishDiagramEvent(diagram.value.id, 'VARIABLE_ADDED', {
                    variable: newVariable,
                    clientId: clientId.value
                }).catch(console.error);
            }
            showCreateModal.value = false;
            return true;
        } catch (err) {
            error.value = 'Failed to create variable';
            console.error('Error creating variable:', err);
            return false;
        } finally {
            creatingVariable.value = false;
        }
    };

    const resetVariableForm = () => {
        newVariable.name = '';
        newVariable.description = '';
    };

    const openCreateModal = () => {
        resetVariableForm();
        showCreateModal.value = true;
    };

    const closeCreateModal = () => {
        showCreateModal.value = false;
        resetVariableForm();
    };

    // Fetch diagram by ID and populate nodes/edges
    const fetchDiagram = async (id) => {
        if (!id) {
            diagram.value = {
                id: `new-${Date.now()}`,
                title: 'New Canvas',
                nodes: [],
                edges: [],
                feedback_loops: [],
                archetypes: []
            };
            nodes.value = [];
            edges.value = [];
            return;
        }

        isLoadingDiagram.value = true;
        error.value = null;

        try {
            // Get diagram data
            const diagramData = await CLDService.getCLDById(id);

            // Try to generate feedback loops and archetypes
            try {
                const updatedDiagram = await CLDService.generateLoopsAndArchetypes(id);
                if (updatedDiagram) {
                    diagram.value = updatedDiagram;
                }
            } catch (genErr) {
                console.error('Error generating feedback loops or archetypes:', genErr);
                diagram.value = diagramData;
            }

            // Populate nodes and edges
            diagramNameRef.value = diagram.value.name || diagram.value.title || 'Untitled';
            nodes.value = diagram.value?.nodes || [];
            let rawEdges = diagram.value?.edges || [];
            if (rawEdges.length === 0 && diagram.value?.relationships) {
                rawEdges = diagram.value.relationships.map(r => ({
                    id: r.id || `${Date.now()}-${Math.random()}`,
                    source: r.source_id,
                    target: r.target_id,
                    type: r.type,
                    polarity: String(r.type).toLowerCase() === 'positive' ? 'positive' : 'negative',
                    has_delay: r.has_delay,
                }));
            }
            const uniqueEdgesMap = new Map();
            rawEdges.forEach(e => {
                const isNegative = e.polarity === 'negative' || e.type === 'NEGATIVE';
                const key = `${e.source}-${e.target}`; // Chave única por direção
                uniqueEdgesMap.set(key, {
                    ...e,
                    polarity: isNegative ? 'negative' : 'positive',
                    type: isNegative ? 'NEGATIVE' : 'POSITIVE',
                    has_delay: e.has_delay,
                });
            });

            edges.value = Array.from(uniqueEdgesMap.values());
            diagram.value.edges = edges.value;

            diagram.value.feedback_loops = getUniqueItems(diagram.value.feedback_loops);
            diagram.value.archetypes = getUniqueItems(diagram.value.archetypes);
            diagram.value.subsystems = diagram.value.subsystems || [];

        } catch (err) {
            error.value = 'Failed to load diagram';
            console.error('Error fetching diagram:', err);
        } finally {
            isLoadingDiagram.value = false;
        }
    };

    // Handle node selection to show info
    const selectNodeInfo = (nodeId) => {
        selectedNode.value = nodeId;

        if (!diagram.value || !nodeId) {
            selectedNodeInfo.value = { nodeName: '', subsystemIds: [], loops: [], archetypes: [] };
            return;
        }

        const node = nodes.value.find(n => n.id === nodeId);
        if (!node) {
            selectedNodeInfo.value = { nodeName: '', subsystemIds: [], loops: [], archetypes: [] };
            return;
        }

        // Find loops containing this node
        const loops = (diagram.value.feedback_loops || []).filter(loop =>
            Array.isArray(loop.variables) &&
            loop.variables.some(v => (typeof v === 'object' ? v.id === nodeId : v === nodeId))
        );

        // Find archetypes containing this node
        const archetypes = (diagram.value.archetypes || []).filter(arch =>
            Array.isArray(arch.variables) &&
            arch.variables.some(v => (typeof v === 'object' ? v.id === nodeId : v === nodeId))
        );

        const subsystem = (diagram.value.subsystems || []).filter(sub =>
            Array.isArray(sub.id) &&
            sub.id.some(v => v === nodeId)
        );

        const getVariableName = (varId) => {
            const variable = nodes.value.find(n => n.id === varId);
            return variable ? variable.name : varId;
        };

        selectedNodeInfo.value = {
            nodeName: node.name,
            loops: (loops || []).map(loop => ({
                id: loop.id,
                type: loop.type,
                variables: Array.isArray(loop.variables)
                    ? loop.variables.map(v => {
                        const id = typeof v === 'object' ? v.id : v;
                        return { id, name: getVariableName(id) };
                    })
                    : []
            })),
            archetypes: (archetypes || []).map(arch => ({
                id: arch.id,
                type: arch.type,
                variables: Array.isArray(arch.variables)
                    ? arch.variables.map(v => {
                        const id = typeof v === 'object' ? v.id : v;
                        return { id, name: getVariableName(id) };
                    })
                    : []
            })),
            subsystemIds: subsystem,
        };
    };

    const clearNodeSelection = () => {
        selectedNode.value = null;
        selectedNodeInfo.value = { nodeName: '', subsystemIds: [], loops: [], archetypes: [] };
    };

    const addNodeToCLD = async (variable, x, y) => {
        if (!diagram.value) return false;

        if (nodes.value.some(n => n.id === variable.id)) {
            console.warn('The variable already exists in this diagram');
            error.value = 'The variable already exists in this diagram'
            return false;
        }

        const newNode = {
            id: variable.id,
            name: variable.name,
            description: variable.description,
            x: x,
            y: y
        };

        nodes.value = [...nodes.value, newNode];
        diagram.value = {
            ...diagram.value,
            nodes: nodes.value,
            edges: edges.value,
        };

        undoStack.value.push({
          action: 'NODE_ADDED',
          data: { node: newNode }
        });

        redoStack.value = [];

        publishDiagramEvent(diagram.value.id, 'NODE_ADDED', {
          node: newNode,
          clientId: getClientId()
        }).catch(err => console.error('Error sending NODE_ADDED event', err));
        await updateLoopsAndArchetypes();
        return true;
    };

    const addConnection = async (sourceId, targetId, polarity = 'positive', hasDelay = false) => {
        if (!diagram.value) return null;

        const existingEdge = edges.value.find(edge =>
            edge.source === sourceId &&
            edge.target === targetId
        );

        if (existingEdge) {
            if (existingEdge.polarity !== polarity) {
                error.value = "Conflicting relationship: Cannot have both positive and negative relationships between the same variables in the same direction";
            } else {
                error.value = "This relationship already exists in the diagram.";
            }
            return null;
        }

        const newRelationship = {
            id: generateId(),
            source: sourceId,
            target: targetId,
            polarity: polarity,
            has_delay: hasDelay
        };

        edges.value = [...edges.value, newRelationship];

        diagram.value = {
            ...diagram.value,
            edges: edges.value,
            relationships: edges.value.map(e => ({
                source_id: e.source,
                target_id: e.target,
                type: e.polarity === 'positive' ? 'POSITIVE' : 'NEGATIVE',
                has_delay: hasDelay
            }))
        };

        undoStack.value.push({
            action: 'EDGE_ADDED',
            data: { edge: newRelationship }
        });
        redoStack.value = [];

        publishDiagramEvent(diagram.value.id, 'EDGE_ADDED', {
            edge: newRelationship,
            clientId: clientId.value
        }).catch(err => console.error(err));

        await updateLoopsAndArchetypes();
        return newRelationship;
    };

    const persistDiagram = async (currentNodes, currentEdges) => {
        if (!diagram.value || !diagram.value.id) {
            return false;
        }

        isLoadingDiagram.value = true;
        error.value = null;

        try {
            const variableIds = currentNodes.map(node => node.id);

            const relationships = currentEdges.map(edge => {
                return {
                    source_id: edge.source,
                    target_id: edge.target,
                    type: edge.polarity === 'positive' ? 'POSITIVE' : 'NEGATIVE',
                    has_delay: edge.has_delay || false
                };
            });
            const payload= {
                name: diagram.value.name || diagram.value.title || '',
                description: diagram.value.description || '',
                date: diagram.value.date || new Date().toISOString().split('T')[0],
                variables: variableIds,
                relationships: relationships,
                subsystems: diagram.value.subsystems || [],
                changes_summary: getChangesSummary()
            }
            const path = window.location.pathname;
            let shareToken = null;

            if (path.includes('/shared/')) {
                shareToken = path.split('/shared/')[1];
            }

            if (shareToken) {
                payload.share_token = shareToken;
            }


            await CLDService.updateCLD(diagram.value.id, payload);
            if (shareToken){
                await fetchSharedDiagram(shareToken);
                return true;
            }
            await fetchDiagram(diagram.value.id);
            return true;

        } catch (err) {
            console.error('Error saving diagram:', err);
            error.value = 'Failed to save the diagram on the server.';
            return false;
        } finally {
            isLoadingDiagram.value = false;
            lastSaveStackSize.value = undoStack.value.length;
        }
    };

    const removeNodeFromDiagram = async (nodeId, visEdges = []) => {
        if (!diagram.value) return;
        const nodeToRemove = nodes.value.find(n => n.id === nodeId);
        if (!nodeToRemove) return;


        const currentPos = provideStateCallback.value ? provideStateCallback.value() : {};
        const nodePos = currentPos[nodeId] || currentPos[String(nodeId)] || currentPos[Number(nodeId)] || { x: 0, y: 0 };

        let edgesToRemove = edges.value.filter(e => e.source === nodeId || e.target === nodeId);

        if (visEdges && visEdges.length > 0) {
            visEdges.forEach(ve => {
                if (!edgesToRemove.some(e => String(e.id) === String(ve.id))) {
                    edgesToRemove.push({
                        id: ve.id,
                        source: ve.from,
                        target: ve.to,
                        polarity: ve.label === '+' ? 'positive' : 'negative'
                    });
                }
            });
        }
        nodes.value = nodes.value.filter(n => n.id !== nodeId);
        edges.value = edges.value.filter(e => e.source !== nodeId && e.target !== nodeId);

        diagram.value = {
            ...diagram.value,
            nodes: nodes.value,
            edges: edges.value
        };

        if (remoteNodeRemovedCallback.value) {
            remoteNodeRemovedCallback.value(nodeId);
        }
        edgesToRemove.forEach(edge => {
            if (remoteEdgeRemovedCallback.value) {
                remoteEdgeRemovedCallback.value(edge.id);
            }
        });

        undoStack.value.push({
            action: 'NODE_REMOVED',
            data: {
                node: { ...nodeToRemove, x: nodePos.x, y: nodePos.y },
                deletedEdges: JSON.parse(JSON.stringify(edgesToRemove))
            }
        });
        redoStack.value = [];

        publishDiagramEvent(diagram.value.id, 'NODE_REMOVED', {
            nodeId,
            clientId: clientId.value
        }).catch(console.error);
        await updateLoopsAndArchetypes();
    };

    const removeEdgeFromDiagram = async (edgeId, visEdge = null) => {
        if (!diagram.value) return;
        let edgeToRemove = edges.value.find(e => e.id != null && String(e.id) === String(edgeId));

        if (!edgeToRemove && visEdge) {
            edgeToRemove = {
                id: edgeId,
                source: visEdge.from,
                target: visEdge.to,
                polarity: visEdge.label === '+' ? 'positive' : 'negative'
            };
        }

        if (!edgeToRemove) {
            console.warn('Edge not found for deletion:', edgeId);
            return;
        }

        edges.value = edges.value.filter(e => {
            if (e.id != null && edgeToRemove.id != null && String(e.id) === String(edgeToRemove.id)) {
                return false;
            }
            if (e.source != null && edgeToRemove.source != null &&
                String(e.source) === String(edgeToRemove.source) &&
                String(e.target) === String(edgeToRemove.target)) {
                return false;
            }
            return true;
        });

        syncPositionsToNodes();

        diagram.value = {
            ...diagram.value,
            edges: edges.value
        };

        if (remoteEdgeRemovedCallback.value) {
            remoteEdgeRemovedCallback.value(edgeId, edgeToRemove.source, edgeToRemove.target);
        }

        undoStack.value.push({
            action: 'EDGE_REMOVED',
            data: { edge: JSON.parse(JSON.stringify(edgeToRemove)) }
        });
        redoStack.value = [];

        publishDiagramEvent(diagram.value.id, 'EDGE_REMOVED', {
            edgeId: edgeId,
            source: edgeToRemove.source,
            target: edgeToRemove.target,
            polarity: edgeToRemove.polarity,
            clientId: clientId.value
        }).catch(console.error);

        await updateLoopsAndArchetypes();
    };

    const handleKafkaEvent = async (event) => {
        const { action, data, clientId: eventClientId } = event;
        console.log(`Received Kafka event: ${action} from client ${eventClientId}`, data);

        if (action !== 'NODE_MOVED' && action !== 'DIAGRAM_SAVED') {
            pendingChanges.value.push({ action: action, data: data });
        }
        if (eventClientId && eventClientId === clientId.value) return;
        switch (action) {
            case 'NODE_ADDED':
               if (!nodes.value.some(n => n.id === data.node.id)) {
                    nodes.value = [...nodes.value, data.node];
                    diagram.value = { ...diagram.value, nodes: nodes.value };
                    if (remoteNodeAddedCallback.value) remoteNodeAddedCallback.value(data.node);
                }
                break;
            case 'NODE_REMOVED':
                nodes.value = nodes.value.filter(n => n.id !== data.nodeId);
                const edgesToRemove = edges.value.filter(e => e.source === data.nodeId || e.target === data.nodeId);
                edges.value = edges.value.filter(e => e.source !== data.nodeId && e.target !== data.nodeId);

                syncPositionsToNodes();
                diagram.value = { ...diagram.value, nodes: nodes.value, edges: edges.value };

                if (remoteNodeRemovedCallback.value) remoteNodeRemovedCallback.value(data.nodeId);
                edgesToRemove.forEach(e => {
                    if (remoteEdgeRemovedCallback.value) remoteEdgeRemovedCallback.value(e.id);
                });
                break;

            case 'EDGE_ADDED':
              if (!edges.value.some(e => e.id === data.edge.id)) {
                edges.value = [...edges.value, data.edge];
                diagram.value = { ...diagram.value, edges: edges.value };
                if (remoteEdgeAddedCallback.value) remoteEdgeAddedCallback.value(data.edge);
              }
              break;

            case 'EDGE_REMOVED':
                edges.value = edges.value.filter(e => {
                    if (e.id != null && data.edgeId != null && String(e.id) === String(data.edgeId)) {
                        return false;
                    }
                    if (e.source != null && data.source != null &&
                        String(e.source) === String(data.source) &&
                        String(e.target) === String(data.target)) {
                        return false;
                    }
                    return true;
                });

                syncPositionsToNodes();
                diagram.value = { ...diagram.value, edges: edges.value };

                if (remoteEdgeRemovedCallback.value) {
                    remoteEdgeRemovedCallback.value(data.edgeId, data.source, data.target);
                }
                break;

            case 'VARIABLE_ADDED':
                const path = window.location.pathname;
                let diagramId = null;
                let shareToken = null;

                if (path.includes('/shared/')) {
                    shareToken = path.split('/shared/')[1];
                } else {
                    diagramId = path.split('/cld/')[1];
                }

                await fetchVariables(diagramId, shareToken);
                break;

            case 'DIAGRAM_NAME_UPDATED':
                if (data.clientId !== clientId.value) {
                    diagramNameRef.value = data.name;
                    if (diagram.value) {
                        diagram.value.name = data.name;
                    }
                }
                break;

            case 'ANALYSIS_UPDATED':
                if (diagram.value) {
                    syncPositionsToNodes();
                    diagram.value = {
                        ...diagram.value,
                        nodes: nodes.value,
                        edges: edges.value,
                        feedback_loops: data.loops || [],
                        archetypes: data.archetypes || []
                    };
                }
                break;
            case 'SUBSYSTEM_UPDATED':
                if (data.clientId !== clientId.value) {
                    if (diagram.value) {
                        diagram.value = {
                            ...diagram.value,
                            subsystems: data.subsystems
                        };
                    }
                }
                break;
        }
    };

    const initCollabMode = (diagramId, userId) => {
        webSocketService.connect(userId);
        webSocketService.joinDiagram(diagramId);
        webSocketService.onDiagramEvent(handleKafkaEvent);

        webSocketService.onStateRequest(({ diagram_id, requester_sid }) => {
            if (diagram_id === diagram.value?.id) {
                const positions = provideStateCallback.value ? provideStateCallback.value() : {};

                const currentState = {
                    nodes: JSON.parse(JSON.stringify(nodes.value)),
                    edges: JSON.parse(JSON.stringify(edges.value)),
                    positions: JSON.parse(JSON.stringify(positions)),
                    subsystems: diagram.value.subsystems,
                    archetypes: diagram.value.archetypes,
                    feedback_loops: diagram.value.feedback_loops,
                };

                webSocketService.pushStateTo(diagram_id, currentState, requester_sid);
            }
        });

        webSocketService.onStateSync(async ({state}) => {
            if (state) {
                nodes.value = state.nodes || [];
                edges.value = state.edges || [];

                if (applyStateCallback.value && state.positions) {
                    applyStateCallback.value(state.positions);
                }

                diagram.value = {...diagram.value,
                    nodes: nodes.value,
                    edges: edges.value,
                    subsystems: state.subsystems,
                    archetypes: state.archetypes,
                    feedback_loops: state.feedback_loops
                };
            }
        });

        webSocketService.onNodeMoved(({ node_id, position, client_id }) => {
            if (client_id !== clientId.value && remoteNodeMovedCallback.value) {
                remoteNodeMovedCallback.value(node_id, position.x, position.y);
            }
        });
    };

    const stopCollabMode = () => {
        webSocketService.disconnect();
    };

    const getClientId = () => {
      return clientId;
    };

    const performUndo = async () => {
      if (undoStack.value.length === 0) return;

      const lastAction = undoStack.value.pop();
      const { action, data } = lastAction;
      let inverseAction;
      let inverseData;

      switch (action) {
        case 'NODE_ADDED':
          inverseAction = 'NODE_REMOVED';
          inverseData = { nodeId: data.node.id, clientId: clientId.value };
          nodes.value = nodes.value.filter(n => n.id !== data.node.id);

          const edgesToDelete = edges.value.filter(e => e.source === data.node.id || e.target === data.node.id);
          edges.value = edges.value.filter(
            e => e.source !== data.node.id && e.target !== data.node.id
          );
          if (remoteNodeRemovedCallback.value) remoteNodeRemovedCallback.value(data.node.id);
          edgesToDelete.forEach(edge => {
              if (remoteEdgeRemovedCallback.value) remoteEdgeRemovedCallback.value(edge.id);
              publishDiagramEvent(diagram.value.id, 'EDGE_REMOVED', { edgeId: edge.id, clientId: clientId.value }).catch(console.error);
          });
          break;

        case 'NODE_REMOVED':
          inverseAction = 'NODE_ADDED';
          inverseData = { node: data.node, clientId: clientId.value };
          nodes.value.push(data.node);
          if (remoteNodeAddedCallback.value) remoteNodeAddedCallback.value(data.node);

          if (data.deletedEdges && data.deletedEdges.length > 0) {
            edges.value.push(...data.deletedEdges);

            data.deletedEdges.forEach(edge => {
                if (remoteEdgeAddedCallback.value) remoteEdgeAddedCallback.value(edge);
                publishDiagramEvent(diagram.value.id, 'EDGE_ADDED', { edge: edge, clientId: clientId.value }).catch(console.error);
            });
          }
          break;

        case 'EDGE_ADDED':
          inverseAction = 'EDGE_REMOVED';
          inverseData = { edgeId: data.edge.id, clientId: clientId.value };
          edges.value = edges.value.filter(e => e.id !== data.edge.id);
          if (remoteEdgeRemovedCallback.value) remoteEdgeRemovedCallback.value(data.edge.id);
          break;

        case 'EDGE_REMOVED':
          inverseAction = 'EDGE_ADDED';
          inverseData = { edge: data.edge, clientId: clientId.value };
          if (!edges.value.some(e => e.id === data.edge.id)) {
            edges.value.push(data.edge);
            if (remoteEdgeAddedCallback.value) remoteEdgeAddedCallback.value(data.edge);
          }
          break;

        default:
          console.warn('Undo is not supported for this action:', action);
          return;
      }

      redoStack.value.push(lastAction);
      diagram.value = {
          ...diagram.value,
          nodes: [...nodes.value],
          edges: [...edges.value],
      };

      publishDiagramEvent(diagram.value.id, inverseAction, inverseData)
        .catch(err => console.error('Error publishing undo:', err));
      await updateLoopsAndArchetypes();
    };

    const openShareModal = async () => {
        if (!diagram.value || !diagram.value.id) return;
        showShareModal.value = true;
        isGeneratingLink.value = true;

        try {
            const token = await CLDService.generateShareToken(diagram.value.id);
            currentShareToken.value = token;
        } catch (err) {
            error.value = 'Error generating share link';
        } finally {
            isGeneratingLink.value = false;
        }
    };

    const closeShareModal = () => {
        showShareModal.value = false;
    };

    const revokeShareLink = async () => {
        if (!diagram.value || !diagram.value.id) return;
        isGeneratingLink.value = true;
        try {
            await CLDService.revokeShareToken(diagram.value.id);
            currentShareToken.value = null;
        } catch (err) {
            error.value = 'Error revoking link';
        } finally {
            isGeneratingLink.value = false;
        }
    };

    const getUniqueItems = (items) => {
        const seen = new Set();
        return (items || []).filter(item => {
            const vars = (item.variables || []).map(v => typeof v === 'object' ? v.id : v).sort().join('|');
            const sig = `${item.type}-${vars}`;
            if (seen.has(sig)) return false;
            seen.add(sig);
            return true;
        });
    };

    const getShareableUrl = computed(() => {
        if (!currentShareToken.value) return '';
        const baseUrl = window.location.origin;
        return `${baseUrl}/calmo/cld/shared/${currentShareToken.value}`;
    });

    const copyShareLink = async () => {
        try {
            await navigator.clipboard.writeText(getShareableUrl.value);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    const emitNodeMovement = (nodeId, position) => {
        if (diagram.value?.id) {
            webSocketService.emitNodeMoved(diagram.value.id, nodeId, position, clientId.value);
        }
    };

    const fetchSharedDiagram = async (token) => {
        isLoadingDiagram.value = true;
        error.value = null;

        try {
            const diagramData = await CLDService.getSharedCLD(token);
            try {
                const updatedDiagram = await CLDService.generateLoopsAndArchetypes(diagramData.id);
                if (updatedDiagram) {
                    diagram.value = updatedDiagram;
                }
            } catch (genErr) {
                console.error('Error generating feedback loops or archetypes:', genErr);
                diagram.value = diagramData;
            }

            diagramNameRef.value = diagram.value.name || diagram.value.title || 'Untitled';
            nodes.value = diagram.value?.nodes || [];
            let rawEdges = diagram.value?.edges || [];
            if (rawEdges.length === 0 && diagram.value?.relationships) {
                rawEdges = diagram.value.relationships.map(r => ({
                    id: r.id || `${Date.now()}-${Math.random()}`,
                    source: r.source_id,
                    target: r.target_id,
                    type: r.type,
                    polarity: String(r.type).toLowerCase() === 'positive' ? 'positive' : 'negative',
                    has_delay: r.has_delay,
                }));
            }

            const uniqueEdgesMap = new Map();
            rawEdges.forEach(e => {
                const isNegative = e.polarity === 'negative' || e.type === 'NEGATIVE';
                const key = `${e.source}-${e.target}`;
                uniqueEdgesMap.set(key, {
                    ...e,
                    polarity: isNegative ? 'negative' : 'positive',
                    type: isNegative ? 'NEGATIVE' : 'POSITIVE',
                    has_delay: e.has_delay,
                });
            });

            edges.value = Array.from(uniqueEdgesMap.values());
            diagram.value.edges = edges.value;

            diagram.value.feedback_loops = getUniqueItems(diagram.value.feedback_loops);
            diagram.value.archetypes = getUniqueItems(diagram.value.archetypes);
            diagram.value.subsystems = diagram.value.subsystems || [];
        } catch (err) {
            error.value = 'Failed to load shared diagram';
            console.error('Error fetching shared diagram:', err);
        } finally {
            isLoadingDiagram.value = false;
        }
    };

    const getChangesSummary = () => {
        const newActions = pendingChanges.value;

        if (newActions.length === 0) return "General update and repositioning.";

        const actionLabels = {
            'NODE_ADDED': 'Variable Added',
            'NODE_REMOVED': 'Variable Removed',
            'EDGE_ADDED': 'New Relationship',
            'EDGE_REMOVED': 'Removed Relationship'
        };

        const getNodeName = (id) => {
            let found = nodes.value.find(n => String(n.id) === String(id));
            if (!found) found = variables.value.find(v => String(v.id) === String(id));
            return found ? (found.name || found.label) : 'Unknown Variable';
        };

        const summaryLines = newActions.map(item => {
            const prefix = actionLabels[item.action] || item.action;

            if (item.action === 'NODE_ADDED' || item.action === 'NODE_REMOVED') {
                const nodeName = item.data.node?.name || item.data.node?.label || 'Unknown Variable';
                return `${prefix}: ${nodeName}`;
            }
            else if (item.action === 'EDGE_ADDED' || item.action === 'EDGE_REMOVED') {
            const edgeData = item.data.edge || item.data;
            if (!edgeData || (!edgeData.source && !edgeData.target)) {
                return `${prefix}: Unkown Relationship`;
            }

            const sourceName = getNodeName(edgeData.source);
            const targetName = getNodeName(edgeData.target);

            const polarity = edgeData.polarity ? String(edgeData.polarity).toUpperCase() : 'UNKNOWN';

            return `${prefix}: ${sourceName} -> ${targetName}, ${polarity}`;
        }

            return `${prefix}`;
        });


        return summaryLines.join('\n');
    };

    const saveDiagramName = async () => {
        if (!diagram.value || !diagramNameRef.value.trim()) return;

        try {
            const payload = {
                name: diagramNameRef.value,
                changes_summary: `Changed CLD name to "${diagramNameRef.value}"`
            };

            const path = window.location.pathname;
            let shareToken = null;

            if (path.includes('/shared/')) {
                shareToken = path.split('/shared/')[1];
            }

            if (shareToken) {
                payload.share_token = shareToken;
            }

            await ApiService.put(`cld/${diagram.value.id}`, payload);

            publishDiagramEvent(diagram.value.id, 'DIAGRAM_NAME_UPDATED', {
                name: diagramNameRef.value,
                clientId: clientId.value
            }).catch(console.error);

        } catch (error) {
            console.error('Error updating diagram name:', error);
        }
    };

    const openHistoryModal = async () => {
        if (!diagram.value?.id) return;

        isHistoryModalOpen.value = true;
        isLoadingHistory.value = true;

        try {
            const response = await ApiService.get(`cld/${diagram.value.id}/history`);
            historyList.value = response.data;
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            isLoadingHistory.value = false;
        }
    };

    const closeHistoryModal = () => {
        isHistoryModalOpen.value = false;
    };

    const formatHistoryText = (text) => {
        if (!text) return '';

        let safeText = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');

        return safeText.split('\n').map(line => {
            let htmlLine = line.trim();

            htmlLine = htmlLine.replace(/^([^:]+:)/, '<strong style="font-weight: bold">$1</strong>');

            if (htmlLine.match(/(\+|, POSITIVE)$/)) {
                htmlLine = htmlLine.replace(/(➔|-&gt;)/g, '<i class="fa-solid fa-arrow-right" style="color: rgb(56, 142, 60);"></i>');
                htmlLine = htmlLine.replace(/\s*\+$/, ' <span class="badge badge-positive">+</span>');
            }
            else if (htmlLine.match(/(-|, NEGATIVE)$/)) {
                htmlLine = htmlLine.replace(/(➔|-&gt;)/g, '<i class="fa-solid fa-arrow-right" style="color: rgb(211, 47, 47);"></i>');
                htmlLine = htmlLine.replace(/\s*-$/, ' <span class="badge badge-negative">-</span>');
            }

            return `<div class="history-line">${htmlLine}</div>`;
        }).join('');
    };

    const updateLoopsAndArchetypes = async () => {
        if (!diagram.value?.id) return;

        try {
            const uniqueEdgesMap = new Map();
            edges.value.forEach(e => {
                const isNeg = e.polarity === 'negative' || e.type === 'NEGATIVE';
                uniqueEdgesMap.set(`${e.source}-${e.target}`, {
                    ...e,
                    polarity: isNeg ? 'negative' : 'positive',
                    type: isNeg ? 'NEGATIVE' : 'POSITIVE'
                });
            });
            edges.value = Array.from(uniqueEdgesMap.values());
            const liveAnalysis = await CLDService.generateLiveLoopsAndArchetypes(nodes.value, edges.value);

            if (liveAnalysis) {
                const getUniqueItems = (items) => {
                    const seen = new Set();
                    return items.filter(item => {
                        const vars = (item.variables || []).map(v => typeof v === 'object' ? v.id : v).sort().join('|');
                        const sig = `${item.type}-${vars}`;
                        if (seen.has(sig)) return false;
                        seen.add(sig);
                        return true;
                    });
                };

                const uniqueLoops = getUniqueItems(liveAnalysis.loops);
                const uniqueArchetypes = getUniqueItems(liveAnalysis.archetypes);

                if (diagram.value) {
                    syncPositionsToNodes();
                    diagram.value = {
                        ...diagram.value,
                        nodes: nodes.value,
                        edges: edges.value,
                        feedback_loops: uniqueLoops,
                        archetypes: uniqueArchetypes
                    };
                }

                publishDiagramEvent(diagram.value.id, 'ANALYSIS_UPDATED', {
                    loops: uniqueLoops,
                    archetypes: uniqueArchetypes,
                    clientId: clientId.value
                }).catch(console.error);
            }
        } catch (error) {
            console.error('Error reprocessing loops and archetypes', error);
            error.value = 'Error reprocessing loops and archetypes'
        }
    };

    const syncPositionsToNodes = () => {
        if (provideStateCallback.value) {
            const currentPos = provideStateCallback.value();
            nodes.value = nodes.value.map(node => {
                const pos = currentPos[node.id] || currentPos[String(node.id)];
                if (pos && pos.x !== undefined && pos.y !== undefined) {
                    return { ...node, x: pos.x, y: pos.y };
                }
                return node;
            });
        }
    };

    const clearError = () => {
        error.value = null;
    };

    const openInfoModal = () => { isInfoModalOpen.value = true; };
    const closeInfoModal = () => { isInfoModalOpen.value = false; };

    const updateLayerCollab = (cleanLayers) => {
        if (!diagram.value?.id) return;
        publishDiagramEvent(diagram.value.id, "SUBSYSTEM_UPDATED", {
            subsystems: cleanLayers,
            clientId: clientId.value
        }).catch(err => console.error(`Error broadcasting SUBSYSTEM_UPDATED:`, err));
    }



    return {
        variables: computed(() => variables.value),
        shapes: computed(() => shapes.value),
        loading: computed(() => loading.value),
        error: computed(() => error.value),
        showCreateModal: computed(() => showCreateModal.value),
        creatingVariable: computed(() => creatingVariable.value),
        diagram: computed(() => diagram.value),
        nodes: computed(() => nodes.value),
        edges: computed(() => edges.value),
        selectedNode: computed(() => selectedNode.value),
        selectedNodeInfo: computed(() => selectedNodeInfo.value),
        isLoadingDiagram: computed(() => isLoadingDiagram.value),
        newVariable,
        fetchVariables,
        fetchDiagram,
        addShape,
        updateShapePosition,
        removeShape,
        getShapeById,
        createVariable,
        openCreateModal,
        closeCreateModal,
        selectNodeInfo,
        clearNodeSelection,
        addConnection,
        addNodeToCLD,
        persistDiagram,
        removeNodeFromDiagram,
        removeEdgeFromDiagram,
        initCollabMode,
        stopCollabMode,
        performUndo,
        undoStack,
        showShareModal: computed(() => showShareModal.value),
        currentShareToken: computed(() => currentShareToken.value),
        isGeneratingLink: computed(() => isGeneratingLink.value),
        getShareableUrl,
        openShareModal,
        closeShareModal,
        revokeShareLink,
        copyShareLink,
        provideStateCallback,
        applyStateCallback,
        remoteNodeMovedCallback,
        emitNodeMovement,
        fetchSharedDiagram,
        remoteNodeAddedCallback,
        remoteNodeRemovedCallback,
        remoteEdgeAddedCallback,
        remoteEdgeRemovedCallback,
        clientId : computed(() => clientId.value),
        diagramNameRef,
        saveDiagramName,
        hasUnsavedChanges,
        isHistoryModalOpen : computed(() => isHistoryModalOpen.value),
        openHistoryModal,
        closeHistoryModal,
        historyList: computed(() => historyList.value),
        isLoadingHistory: computed(() => isLoadingHistory.value),
        formatHistoryText,
        clearError,
        isInfoModalOpen: computed(() => isInfoModalOpen.value),
        openInfoModal,
        closeInfoModal,
        updateLayerCollab
    };
}