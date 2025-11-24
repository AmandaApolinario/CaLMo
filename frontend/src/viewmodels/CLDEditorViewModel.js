import { ref, reactive, computed } from 'vue';
import CLDService from '@/services/cld.service';
import ApiService from '@/services/api.service';

export function useCLDEditorViewModel() {
  // Initialize with default empty structure to avoid null references
  const diagram = ref({
    title: '',
    description: '',
    createdAt: new Date().toISOString().split('T')[0],
    nodes: [],
    edges: []
  });
  const variables = ref([]);
  const loading = ref(false);
  const saving = ref(false);
  const error = ref(null);
  const successMessage = ref('');
  const showImportModal = ref(false);
  const importMessages = ref({
    show: false,
    type: 'success', // 'success' | 'error'
    text: ''
  });
  let notificationTimeout = null;

  // Initialize empty diagram structure
  const createEmptyDiagram = () => {
    return {
      title: '',
      description: '',
      createdAt: new Date().toISOString().split('T')[0],
      nodes: [],
      edges: []
    };
  };

  // Reset diagram to empty state
  const resetDiagram = () => {
    diagram.value = createEmptyDiagram();
    console.log('Diagram reset to empty state:', diagram.value);
  };

  // Fetch all available variables
  const fetchVariables = async () => {
    loading.value = true;
    try {
      const response = await ApiService.get('variables');
      variables.value = response.data || [];
      console.log('Variables fetched:', variables.value);
    } catch (err) {
      error.value = 'Failed to fetch variables';
      console.error('Error fetching variables:', err);
      variables.value = []; // Ensure it's always an array
    } finally {
      loading.value = false;
    }
  };

  // Fetch an existing diagram for editing
  const fetchDiagram = async (id) => {
    loading.value = true;
    error.value = null;

    try {
      // Get diagram data
      const fetchedDiagram = await CLDService.getCLDById(id);

      if (!fetchedDiagram) {
        throw new Error('Failed to fetch diagram data');
      }

      // Format the date properly for the date input (YYYY-MM-DD)
      let formattedDate;
      if (fetchedDiagram.date) {
        // Handle if it's already a string in YYYY-MM-DD format
        formattedDate = fetchedDiagram.date;
      } else if (fetchedDiagram.createdAt) {
        // Handle if it's a Date object or ISO string
        const date = new Date(fetchedDiagram.createdAt);
        formattedDate = date.toISOString().split('T')[0];
      } else {
        // Default to today if no date is available
        formattedDate = new Date().toISOString().split('T')[0];
      }

      console.log('Formatted date for diagram:', formattedDate);

      // Transform to editor format if needed
      diagram.value = {
        ...fetchedDiagram,
        // Ensure consistency with form fields
        title: fetchedDiagram.title || fetchedDiagram.name || '',
        description: fetchedDiagram.description || '',
        createdAt: formattedDate,
        nodes: fetchedDiagram.nodes || fetchedDiagram.variables || [],
        edges: fetchedDiagram.edges || (fetchedDiagram.relationships ? fetchedDiagram.relationships.map(r => ({
          source: r.source_id,
          target: r.target_id,
          polarity: r.type?.toLowerCase() === 'positive' ? 'positive' : 'negative'
        })) : [])
      };

      console.log('Diagram fetched:', diagram.value);

      // Also fetch variables for relationship editing
      await fetchVariables();

      return diagram.value;
    } catch (err) {
      error.value = 'Failed to fetch diagram';
      console.error('Error fetching diagram:', err);
      // Set to empty diagram instead of null
      resetDiagram();
      return diagram.value;
    } finally {
      loading.value = false;
    }
  };

  // Save a new diagram
  const createDiagram = async (diagramData) => {
    if (!diagramData) {
      error.value = 'No diagram data to save';
      return null;
    }

    saving.value = true;
    error.value = null;
    successMessage.value = '';

    try {
      // Extract variable IDs from the relationships
      const variableIds = new Set();
      (diagramData.edges || []).forEach(edge => {
        if (edge.source) variableIds.add(edge.source);
        if (edge.target) variableIds.add(edge.target);
      });

      // Format relationships in the way the backend expects them
      const relationships = (diagramData.edges || []).map(edge => {
        return {
          source_id: edge.source,
          target_id: edge.target,
          type: edge.polarity === 'positive' ? 'POSITIVE' : 'NEGATIVE'
        };
      });

      // Transform data for API - using the exact field names required by the backend
      const apiData = {
        name: diagramData.title || '',
        description: diagramData.description || '',
        date: diagramData.createdAt || new Date().toISOString().split('T')[0],
        variables: Array.from(variableIds),
        relationships: relationships
      };

      console.log('Creating diagram with API data:', apiData);
      const newDiagram = await CLDService.createCLD(apiData);

      successMessage.value = 'Diagram created successfully!';
      return newDiagram;
    } catch (err) {
      error.value = 'Failed to create diagram';
      console.error('Error creating diagram:', err);
      return null;
    } finally {
      saving.value = false;
    }
  };

  // Update an existing diagram
  const updateDiagram = async (id, diagramData) => {
    if (!diagramData) {
      error.value = 'No diagram data to update';
      return null;
    }

    saving.value = true;
    error.value = null;
    successMessage.value = '';

    try {
      // Extract variable IDs from the relationships
      const variableIds = new Set();
      (diagramData.edges || []).forEach(edge => {
        if (edge.source) variableIds.add(edge.source);
        if (edge.target) variableIds.add(edge.target);
      });

      // Format relationships in the way the backend expects them
      const relationships = (diagramData.edges || []).map(edge => {
        return {
          source_id: edge.source,
          target_id: edge.target,
          type: edge.polarity === 'positive' ? 'POSITIVE' : 'NEGATIVE'
        };
      });

      // Transform data for API - using the exact field names required by the backend
      const apiData = {
        name: diagramData.title || '',
        description: diagramData.description || '',
        date: diagramData.createdAt || new Date().toISOString().split('T')[0],
        variables: Array.from(variableIds),
        relationships: relationships
      };

      console.log('Updating diagram with API data:', apiData);
      const updatedDiagram = await CLDService.updateCLD(id, apiData);

      successMessage.value = 'Diagram updated successfully!';
      return updatedDiagram;
    } catch (err) {
      error.value = 'Failed to update diagram';
      console.error('Error updating diagram:', err);
      return null;
    } finally {
      saving.value = false;
    }
  };

  // Add a new edge (relationship)
  const addEdge = () => {
    if (!diagram.value) {
      resetDiagram();
    }

    if (!diagram.value.edges) {
      diagram.value.edges = [];
    }

    diagram.value.edges.push({
      source: '',
      target: '',
      polarity: 'positive'
    });

    console.log('Edge added, edges now:', diagram.value.edges);
  };


  const importEdges = (newEdges) => {
    if (!diagram.value) {
      resetDiagram();
    }

    if (!diagram.value.edges) {
      diagram.value.edges = [];
    }

    const resolveToId = (val) => {
      if (!val && val !== 0) return '';

      const str = String(val).trim();
      if (!str) return '';

      const normalize = s => String(s ?? '').trim().toLowerCase();

      const byId = (variables.value || []).find(v => normalize(v.id) === normalize(str));
      if (byId) return byId.id;

      const byVar = (variables.value || []).find(v => {
        return [v.name, v.label, v.title, v.id].some(f => normalize(f) === normalize(str));
      });
      if (byVar) return byVar.id;
      const byNode = (diagram.value.nodes || []).find(n => {
        return [n.name, n.label, n.title, n.id].some(f => normalize(f) === normalize(str));
      });
      if (byNode) return byNode.id ?? (byNode.name ?? byNode.label ?? '');

      return val;
    };

    const edgesToProcess = (newEdges || []);
    const added = [];
    const skipped = [];
    const errors = [];

    for (const e of edgesToProcess) {
      const srcResolved = resolveToId(e.source);
      const tgtResolved = resolveToId(e.target);
      const polarity = e.polarity ?? 'positive';

      // checa resolução
      if (!srcResolved || !tgtResolved) {
        errors.push({ edge: e, reason: `Unresolved ${!srcResolved ? 'source' : ''}${!srcResolved && !tgtResolved ? ' & ' : ''}${!tgtResolved ? 'target' : ''}` });
        skipped.push(e);
        continue;
      }

      // evita self-loop
      if (String(srcResolved) === String(tgtResolved)) {
        errors.push({ edge: e, reason: 'Source and target are the same' });
        skipped.push(e);
        continue;
      }

      // checa conflito com edges já existentes no diagrama
      const exists = (diagram.value.edges || []).find(ed => String(ed.source) === String(srcResolved) && String(ed.target) === String(tgtResolved));
      if (exists && exists.polarity !== polarity) {
        errors.push({ edge: e, reason: `Conflicting relationship types: Cannot have both positive and negative relationships between the same variables in the same direction` });
        skipped.push(e);
        continue;
      }

      // checa conflito com edges que já adicionamos nesta importação
      const existsInAdded = added.find(ed => String(ed.source) === String(srcResolved) && String(ed.target) === String(tgtResolved));
      if (existsInAdded && existsInAdded.polarity !== polarity) {
        errors.push({ edge: e, reason: `Conflicting relationship types: Cannot have both positive and negative relationships between the same variables in the same direction` });
        skipped.push(e);
        continue;
      }

      // tudo ok, adiciona à lista temporária
      added.push({ source: srcResolved, target: tgtResolved, polarity });
    }

    // persiste só os adicionados válidos
    if (added.length > 0) {
      diagram.value.edges.push(...added);
      showNotification(`${added.length} relationship(s) imported successfully.`, 'success');
    }

    if (errors.length > 0) {
      const errText = errors.slice(0,5).map(er => `${er.reason}`).join('<br>');
      showNotification(`${errors.length} error(s)<br> ${errText}`, 'error');
    }
  };

  // Remove an edge at a specific index
  const removeEdge = (index) => {
    if (!diagram.value || !diagram.value.edges) return;

    diagram.value.edges.splice(index, 1);
  };

  // Filter out source variable from target options
  const filteredTargetVariables = (sourceId) => {
    if (!sourceId) return variables.value || [];
    return (variables.value || []).filter(v => v.id !== sourceId);
  };

  // Validate the diagram before saving
  const validateDiagram = () => {
    if (!diagram.value) return 'No diagram data';
    if (!diagram.value.title) return 'Diagram title is required';
    if (!diagram.value.edges || diagram.value.edges.length === 0) return 'At least one relationship is required';

    // Check for incomplete relationships
    for (const edge of diagram.value.edges) {
      if (!edge.source) return 'Source variable is required for all relationships';
      if (!edge.target) return 'Target variable is required for all relationships';
      if (!edge.polarity) return 'Relationship type (polarity) is required for all relationships';
    }

    // Check for duplicate relationships with the exact same source and target with different polarities
    const relationshipMap = new Map();

    for (const edge of diagram.value.edges) {
      // Create a unique key for this exact relationship direction
      const relationshipKey = `${edge.source}-${edge.target}`;

      if (relationshipMap.has(relationshipKey)) {
        const existingPolarity = relationshipMap.get(relationshipKey);
        if (existingPolarity !== edge.polarity) {
          return `Conflicting relationship types: Cannot have both positive and negative relationships between the same variables in the same direction`;
        }
      }

      relationshipMap.set(relationshipKey, edge.polarity);
    }

    return null;
  };


  function showNotification(text, type = 'success') {
    clearTimeout(notificationTimeout)
    importMessages.value = { show: true, type, text, }
    notificationTimeout = setTimeout(() => {
      importMessages.value.show = false
    }, 5000)
  }

  return {
    diagram,
    variables,
    loading,
    saving,
    error,
    successMessage,
    createEmptyDiagram,
    resetDiagram,
    fetchVariables,
    fetchDiagram,
    createDiagram,
    updateDiagram,
    addEdge,
    removeEdge,
    filteredTargetVariables,
    validateDiagram,
    importEdges,
    showImportModal,
    importMessages
  };
} 