import { ref, reactive } from 'vue';
import ApiService from '@/services/api.service';

export function useVariablesViewModel() {
  const variables = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const message = ref('');
  const isEditing = ref(false);
  const editingId = ref(null);
  
  const newVariable = reactive({
    name: '',
    description: ''
  });

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
    cancelEditing
  };
} 