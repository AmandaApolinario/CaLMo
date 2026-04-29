import { ref, computed, onMounted, reactive } from 'vue';
import ApiService from '@/services/api.service';
import CLDService from '@/services/cld.service';

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
    const selectedNodeInfo = ref({ nodeName: '', loops: [], archetypes: [] });
    const selectedEdge = ref(null);
    const isLoadingDiagram = ref(false);


    const newVariable = reactive({
        name: '',
        description: ''
    });

    const fetchVariables = async () => {
        loading.value = true;
        error.value = null;

        try {
            const response = await ApiService.get('variables');
            variables.value = response.data || [];
        } catch (err) {
            error.value = 'Erro ao carregar variáveis';
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

    const createVariable = async () => {
        if (!newVariable.name.trim()) {
            return false;
        }

        creatingVariable.value = true;
        error.value = null;

        try {
            await ApiService.post('variable', {
                name: newVariable.name.trim(),
                description: newVariable.description.trim()
            });

            resetVariableForm();
            await fetchVariables();
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
            nodes.value = diagram.value?.nodes || [];
            edges.value = diagram.value?.edges || [];

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
            selectedNodeInfo.value = { nodeName: '', loops: [], archetypes: [] };
            return;
        }

        const node = nodes.value.find(n => n.id === nodeId);
        if (!node) {
            selectedNodeInfo.value = { nodeName: '', loops: [], archetypes: [] };
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
            }))
        };
    };

    const clearNodeSelection = () => {
        selectedNode.value = null;
        selectedNodeInfo.value = { nodeName: '', loops: [], archetypes: [] };
    };

    const addNodeToDiagram = (variable) => {
        if (!diagram.value) return false;

        if (nodes.value.some(n => n.id === variable.id)) {
            console.warn('A variável já existe neste diagrama');
            return false;
        }

        const newNode = {
            id: variable.id,
            name: variable.name,
            description: variable.description
        };

        nodes.value = [...nodes.value, newNode];
        diagram.value = {
            ...diagram.value,
            nodes: nodes.value,
            edges: edges.value,
            relationships: edges.value
        };

        return true;
    };

    const addConnection = async (sourceId, targetId, polarity) => {
        if (!diagram.value || !diagram.value.id) {
            error.value = "Nenhum diagrama selecionado para salvar a conexão.";
            return false;
        }

        isLoadingDiagram.value = true;

        try {
            const newRelationship = {
                id: generateId(),
                source: sourceId,
                target: targetId,
                polarity: polarity
            };

            const updatedRelationships = [...(edges.value || []), newRelationship];

            await CLDService.updateCLD(diagram.value.id, {
                name: diagram.value.name,
                description: diagram.value.description,
                variables: nodes.value,
                relationships: updatedRelationships
            });

            await fetchDiagram(diagram.value.id);
            return true;
        } catch (err) {
            console.error('Erro ao adicionar conexão:', err);
            error.value = 'Falha ao salvar a nova conexão.';
            return false;
        } finally {
            isLoadingDiagram.value = false;
        }
    };

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
        addNodeToDiagram
    };
}