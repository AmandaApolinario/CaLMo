import { ref, reactive } from 'vue';
import ApiService from '@/services/api.service';
import {FileParserService} from "@/services/fileParser.service.js";
import {FileExportService} from "@/services/fileExport.service.js";

export function useVariablesViewModel() {
  const variables = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const message = ref('');
  const isEditing = ref(false);
  const editingId = ref(null);
  const isImporting = ref(false);
  const selectedVariables = ref([]);
  
  const newVariable = reactive({
    name: '',
    description: ''
  });

  const variableSchema = {
    xmlSelector: 'aux, stock, flow',

    fields: {
      name: {
        required: true,
        xmlAttr: 'name'
      },
      description: {
        required: false,
        default: '',
        xmlNode: 'doc'
      }
    }
  };

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

  const createVariable = async (item = null) => {
    loading.value = true;
    error.value = null;
    
    try {
      await ApiService.post('variable', {
        name: item ? item.name : newVariable.name,
        description: item ? item.description: newVariable.description
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

  const importVariablesFromFile = async (file) => {
    isImporting.value = true;
    error.value = null;
    message.value = '';

    try {
      const items = await FileParserService.parseFile(file, variableSchema);

      if (items.length === 0) {
        throw new Error('No valid variables found in the file.');
      }

      let successCount = 0;
      for (const item of items) {
        try {
          await createVariable(item);
          successCount++;
        } catch (e) {
          console.warn(`Failed to import variable: ${item.name}`, e);
        }
      }

      message.value = `Successfully imported ${successCount} out of ${items.length} variables!`;
      await fetchVariables();
    } catch (err) {
      error.value = err.message || 'Failed to import variables';
      console.error('Import error:', err);
    } finally {
      isImporting.value = false;
      setTimeout(() => { if (message.value.includes('Successfully')) message.value = ''; }, 5000);
    }
  };

  const exportSelectedVariables = (format, filename = 'exported_variables') => {
    if (selectedVariables.value.length === 0) return;

    const varsToExport = variables.value.filter(v => selectedVariables.value.includes(v.id));

    if (format === 'xmile') {
      FileExportService.exportToXMILEVariables(varsToExport, filename);
    } else {
      const dataToExport = varsToExport.map(v => ({
        name: v.name,
        description: v.description || ''
      }));
      if (format === 'json') FileExportService.exportToJSON(dataToExport, filename);
      if (format === 'csv') FileExportService.exportToCSV(dataToExport, filename);
    }
  };

  const deleteSelectedVariables = async () => {
    if (selectedVariables.value.length === 0) return;

    loading.value = true;
    error.value = null;
    message.value = '';

    let successCount = 0;
    const failedVariables = [];

    for (const id of selectedVariables.value) {
      try {
        await ApiService.delete(`variable/${id}`);
        successCount++;
      } catch (err) {
        const varObj = variables.value.find(v => v.id === id);
        failedVariables.push(varObj ? varObj.name : id);
      }
    }

    selectedVariables.value = [];
    await fetchVariables();

    if (failedVariables.length === 0) {
      message.value = `Successfully deleted ${successCount} variables!`;
    } else {
      error.value = `Deleted ${successCount} variables. Failed: ${failedVariables.join(', ')}`;
    }

    loading.value = false;
    setTimeout(() => { message.value = ''; error.value = null; }, 6000);
  };

  const toggleSelectAll = () => {
    if (selectedVariables.value.length === variables.value.length && variables.value.length > 0) {
      selectedVariables.value = [];
    } else {
      selectedVariables.value = variables.value.map(v => v.id);
    }
  };

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
    importVariablesFromFile,
    isImporting,
    selectedVariables,
    deleteSelectedVariables,
    exportSelectedVariables,
    toggleSelectAll
  };
} 