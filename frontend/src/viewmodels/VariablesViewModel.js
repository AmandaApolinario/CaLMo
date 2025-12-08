import { ref, reactive } from 'vue';
import ApiService from '@/services/api.service';

export function useVariablesViewModel() {
  const variables = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const message = ref('');
  const isEditing = ref(false);
  const editingId = ref(null);
  const showImportModal = ref(false);
  const importMessages = ref({
    show: false,
    type: 'success', // 'success' | 'error'
    text: ''
  });
  let notificationTimeout = null;

  const newVariable = reactive({
    name: '',
    description: ''
  });
  const exporting = ref(false)
  const selectedVariables = ref([])

  const fetchVariables = async () => {
    loading.value = true;
    error.value = null;

    try {
      const response = await ApiService.get('variables');
      const data = response.data;

      if (data.message) {
        message.value = data.message;
      } else {
        variables.value = data;
      }
    } catch (err) {
      error.value = 'Failed to fetch variables';
      console.error('Error fetching variables:', err);
    } finally {
      loading.value = false;
    }
  };

  const createVariable = async () => {
    loading.value = true;
    error.value = null;

    try {
      await ApiService.post('variable', {
        name: newVariable.name,
        description: newVariable.description
      });

      resetForm();
      await fetchVariables();
      return true;
    } catch (err) {
      error.value = 'Failed to create variable';
      console.error('Error creating variable:', err);
      return false;
    } finally {
      loading.value = false;
    }
  };

  const updateVariable = async () => {
    if (!editingId.value) return false;

    loading.value = true;
    error.value = null;

    try {
      await ApiService.put(`variable/${editingId.value}`, {
        name: newVariable.name,
        description: newVariable.description
      });

      resetForm();
      await fetchVariables();
      return true;
    } catch (err) {
      error.value = 'Failed to update variable';
      console.error('Error updating variable:', err);
      return false;
    } finally {
      loading.value = false;
    }
  };

  const deleteVariable = async (id) => {
    loading.value = true;
    error.value = null;

    try {
      await ApiService.delete(`variable/${id}`);
      await fetchVariables();
      return true;
    } catch (err) {
      error.value = 'Failed to delete variable';
      console.error('Error deleting variable:', err);
      return false;
    } finally {
      loading.value = false;
    }
  };

  const startEditing = (variable) => {
    newVariable.name = variable.name;
    newVariable.description = variable.description || '';
    editingId.value = variable.id;
    isEditing.value = true;
  };

  const cancelEditing = () => {
    resetForm();
  };

  const resetForm = () => {
    newVariable.name = '';
    newVariable.description = '';
    isEditing.value = false;
    editingId.value = null;
  };

  const submitForm = async () => {
    if (isEditing.value) {
      return await updateVariable();
    } else {
      return await createVariable();
    }
  };

  const importVariables = async (importedVariables) => {
    loading.value = true;
    error.value = null;
    try {
      await ApiService.post('variable/import', { variables: importedVariables });
      await fetchVariables();
      showNotification('Variables Imported with Success', 'success');
      return true;
    } catch (err) {
      const resp = err?.response?.data;
      const payload = resp?.message || resp?.errors || err.message || 'Unknown error';
      const text = Array.isArray(payload) ? payload.join('<br/>') : String(payload);
      showNotification(`Error importing variables:<br/> ${text}`, 'error');
      return false;
    } finally {
      loading.value = false;
    }
  };

  const exportVariable = async (variableIds) => {
    let selected;
    if (!variableIds || variableIds.length === 0) {
      selected = [{
        name: '',
        description: ''
      }];
    } else {
      selected = variables.value
        .filter(v => variableIds.includes(v.id))
        .map(({ name, description }) => ({ name, description }));
    }
    const json = JSON.stringify(selected, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'variables_export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification('Exported variables as JSON!', 'success');
  }
  const showNotification = (text, type = 'success') => {
    clearTimeout(notificationTimeout)
    importMessages.value = { show: true, type, text, }
    notificationTimeout = setTimeout(() => {
      importMessages.value.show = false
    }, 5000)
  }

  const toggleExporting = () => {
    exporting.value = !exporting.value
    selectedVariables.value = []
  }

  const selectAll = () => {
    if (selectedVariables.value.length === variables.value.length) {
      selectedVariables.value = []
    } else {
      selectedVariables.value = variables.value.map(v => v.id)
    }
  }

  const confirmExport = () => {
    exportVariable(selectedVariables.value)
    exporting.value = false
    selectedVariables.value = []
  }

  return {
    variables,
    loading,
    error,
    message,
    isEditing,
    newVariable,
    fetchVariables,
    submitForm,
    deleteVariable,
    startEditing,
    cancelEditing,
    showImportModal,
    importVariables,
    importMessages,
    notificationTimeout,
    exporting,
    selectedVariables,
    toggleExporting,
    selectAll,
    confirmExport,
  };
}