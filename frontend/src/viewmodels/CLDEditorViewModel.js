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
    
    if (!diagram.value.title) {
      return 'Diagram name is required';
    }
    
    if (!diagram.value.createdAt) {
      return 'Date is required';
    }
    
    if (!diagram.value.edges || diagram.value.edges.length === 0) {
      return 'At least one relationship is required';
    }
    
    // Check for duplicate or invalid relationships
    const edgeErrors = [];
    if (diagram.value.edges && diagram.value.edges.length > 0) {
      diagram.value.edges.forEach((edge, index) => {
        if (!edge.source) {
          edgeErrors.push(`Relationship #${index + 1} is missing a source variable`);
        }
        
        if (!edge.target) {
          edgeErrors.push(`Relationship #${index + 1} is missing a target variable`);
        }
        
        if (edge.source === edge.target) {
          edgeErrors.push(`Relationship #${index + 1} cannot have the same source and target`);
        }
      });
    }
    
    if (edgeErrors.length > 0) {
      return edgeErrors.join(', ');
    }
    
    return null;
  };
  
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
    validateDiagram
  };
} 