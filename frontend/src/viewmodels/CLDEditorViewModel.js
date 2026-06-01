import { ref, reactive, computed } from 'vue';
import CLDService from '@/services/cld.service';
import ApiService from '@/services/api.service';
import {FileParserService} from "@/services/fileParser.service.js";

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
  const isImporting = ref(false);

  const relationshipSchema = {
    xmlSelector: 'connector',
    fields: {
      source: { required: true, xmlAttr: 'from' },
      target: { required: true, xmlAttr: 'to' },
      polarity: { required: false, default: 'positive', xmlAttr: 'polarity' }
    }
  };
  
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
        edges: (fetchedDiagram.relationships || []).map(r => ({
          source: r.source_id,
          target: r.target_id,
          polarity: r.type?.toLowerCase() === 'positive' ? 'positive' : 'negative',
          has_delay: !!r.has_delay
        }))
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
  const createDiagram = async (diagramData, isCanvasRedirect = false) => {
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
          type: edge.polarity === 'positive' ? 'POSITIVE' : 'NEGATIVE',
          has_delay: edge.has_delay,
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
      if(isCanvasRedirect){
        const newDiagram = await CLDService.createEmptyCLD(apiData);
        successMessage.value = 'Diagram created successfully!';
        return newDiagram;
      }

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
          type: edge.polarity === 'positive' ? 'POSITIVE' : 'NEGATIVE',
          has_delay: edge.has_delay,
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
      polarity: 'positive',
      has_delay: false,
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

  const importRelationshipsFromFile = async (file) => {
    isImporting.value = true;
    error.value = null;
    successMessage.value = '';

    try {
      const parsedEdges = await FileParserService.parseFile(file, relationshipSchema);

      if (parsedEdges.length === 0) {
        throw new Error('No valid relationships found in the file.');
      }

      const uniqueVarNames = new Set();
      parsedEdges.forEach(edge => {
        if (edge.source) uniqueVarNames.add(edge.source.trim());
        if (edge.target) uniqueVarNames.add(edge.target.trim());
      });

      await fetchVariables();
      const existingNamesMap = new Map();
      variables.value.forEach(v => existingNamesMap.set(v.name.toLowerCase().trim(), v.id));

      let newlyCreatedCount = 0;
      for (const name of uniqueVarNames) {
        const normalizedName = name.toLowerCase();
        if (!existingNamesMap.has(normalizedName)) {
          try {
             const response = await ApiService.post('variable', { name: name, description: 'Created via Relationship Import' });
             existingNamesMap.set(normalizedName, response.data.id);
             newlyCreatedCount++;
          } catch (e) {
             console.error(`Failed to auto-create variable: ${name}`, e);
          }
        }
      }

      if (newlyCreatedCount > 0) {
         await fetchVariables();
         variables.value.forEach(v => existingNamesMap.set(v.name.toLowerCase().trim(), v.id));
      }

      if (!diagram.value.edges) diagram.value.edges = [];

      let addedEdgesCount = 0;
      parsedEdges.forEach(edge => {
         const sourceId = existingNamesMap.get(edge.source.toLowerCase().trim());
         const targetId = existingNamesMap.get(edge.target.toLowerCase().trim());

         if (sourceId && targetId) {
            let pol = String(edge.polarity).toLowerCase();
            if (pol === '+' || pol === '1' || pol === 'positive') pol = 'positive';
            else if (pol === '-' || pol === '-1' || pol === 'negative') pol = 'negative';
            else pol = 'positive';

            diagram.value.edges.push({
               source: sourceId,
               target: targetId,
               polarity: pol
            });
            addedEdgesCount++;
         }
      });

      successMessage.value = `Imported ${addedEdgesCount} relationships and auto-created ${newlyCreatedCount} missing variables!`;
      setTimeout(() => { successMessage.value = '' }, 6000);
    } catch (err) {
      error.value = err.message || 'Failed to import relationships';
      console.error('Import error:', err);
    } finally {
      isImporting.value = false;
    }
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
    validateDiagram,
    isImporting,
    importRelationshipsFromFile
  };
} 