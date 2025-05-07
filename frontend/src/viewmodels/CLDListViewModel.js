import { ref, reactive, computed } from 'vue';
import CLDService from '@/services/cld.service';

export function useCLDListViewModel() {
  const diagrams = ref([]);
  const loading = ref(false);
  const error = ref(null);
  
  const state = reactive({
    filter: '',
    sorting: 'newest',
  });

  const filteredDiagrams = computed(() => {
    if (!state.filter) return diagrams.value;
    
    return diagrams.value.filter(diagram => 
      diagram.title.toLowerCase().includes(state.filter.toLowerCase()) ||
      diagram.description.toLowerCase().includes(state.filter.toLowerCase())
    );
  });

  const sortedDiagrams = computed(() => {
    const diagramsToSort = [...filteredDiagrams.value];
    
    switch (state.sorting) {
      case 'newest':
        return diagramsToSort.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      case 'oldest':
        return diagramsToSort.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      case 'alphabetical':
        return diagramsToSort.sort((a, b) => a.title.localeCompare(b.title));
      default:
        return diagramsToSort;
    }
  });

  async function fetchDiagrams() {
    loading.value = true;
    error.value = null;
    
    try {
      diagrams.value = await CLDService.getAllCLDs();
    } catch (err) {
      error.value = err.message || 'Failed to fetch diagrams';
    } finally {
      loading.value = false;
    }
  }

  async function deleteDiagram(id) {
    loading.value = true;
    error.value = null;
    
    try {
      await CLDService.deleteCLD(id);
      diagrams.value = diagrams.value.filter(diagram => diagram.id !== id);
    } catch (err) {
      error.value = err.message || 'Failed to delete diagram';
    } finally {
      loading.value = false;
    }
  }

  function setFilter(filter) {
    state.filter = filter;
  }

  function setSorting(sorting) {
    state.sorting = sorting;
  }

  return {
    diagrams: sortedDiagrams,
    loading,
    error,
    filter: computed(() => state.filter),
    sorting: computed(() => state.sorting),
    fetchDiagrams,
    deleteDiagram,
    setFilter,
    setSorting
  };
} 