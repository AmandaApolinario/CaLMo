import { ref } from 'vue';
import CLDService from '@/services/cld.service';
import ApiService from '@/services/api.service';

export function useCLDDetailViewModel() {
  const diagram = ref(null);
  const loading = ref(true);
  const error = ref(null);

  async function fetchDiagram(id) {
    loading.value = true;
    error.value = null;
    
    try {
      // First get the basic diagram data
      diagram.value = await CLDService.getCLDById(id);
      
      // Generate feedback loops and archetypes and get updated diagram
      try {
        // Use the centralized utility function to generate and fetch loops and archetypes
        const updatedDiagram = await CLDService.generateLoopsAndArchetypes(id);
        if (updatedDiagram) {
          diagram.value = updatedDiagram;
        }
      } catch (genErr) {
        console.error('Error generating feedback loops or archetypes:', genErr);
        // Continue without setting error - still show the diagram
      }
    } catch (err) {
      error.value = err.message || 'Failed to load diagram';
      console.error('Error fetching diagram:', err);
    } finally {
      loading.value = false;
    }
  }

  return {
    diagram,
    loading,
    error,
    fetchDiagram
  };
} 