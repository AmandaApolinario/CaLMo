import { ref, reactive, computed } from 'vue';
import CLDService from '@/services/cld.service';

export function useCLDListViewModel() {
  const diagrams = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const showImportModal = ref(false);
  const messages = ref({
    show: false,
    type: 'success', // 'success' | 'error'
    text: ''
  });
  let notificationTimeout = null;

  const state = reactive({
    filter: '',
    sorting: 'newest',
  });
  const exporting = ref(false)
  const selectedDiagrams = ref([])

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

  async function importDiagrams(cldDataArray) {
    try {
      const response = await CLDService.importCLDs(cldDataArray);
      showNotification('Imported diagrams successfully!', 'success');
      return response.clds || [];
    } catch (error) {
      showNotification(error.message || 'Failed to import diagrams', 'error');
      return [];
    } finally {
      await fetchDiagrams();
    }
  }

  async function exportDiagrams(diagramIds) {
    try {
      // Uses optimized backend endpoint to export formatted CLDs
      const response = await CLDService.exportCLDsByIds(diagramIds);
      const clds = response.clds || [];
      const json = JSON.stringify(clds, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cld_diagrams_export.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showNotification('Exported diagrams as JSON!', 'success');
    } catch (error) {
      showNotification(error.message || 'Failed to export diagrams', 'error');
    }
  }

  function toggleExporting() {
    exporting.value = !exporting.value
    selectedDiagrams.value = []
  }

  function selectAll() {
    if (selectedDiagrams.value.length === diagrams.value.length) {
      selectedDiagrams.value = []
    } else {
      selectedDiagrams.value = diagrams.value.map(d => d.id)
    }
  }

  function confirmExport() {
    exportDiagrams(selectedDiagrams.value)
    exporting.value = false
    selectedDiagrams.value = []
  }

  function showNotification(text, type = 'success') {
    clearTimeout(notificationTimeout)
    messages.value = { show: true, type, text }
    notificationTimeout = setTimeout(() => {
      messages.value.show = false
    }, 5000)
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
    setSorting,
    showImportModal,
    importDiagrams,
    messages,
    exporting,
    selectedDiagrams,
    toggleExporting,
    selectAll,
    confirmExport,
  }
} 