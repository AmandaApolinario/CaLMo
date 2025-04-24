<template>
  <div class="variables-container">
    <h2>Variables Management</h2>

    <div class="layout">
      <!-- Create/Edit Variable Form -->
      <div class="form-panel">
        <h3>{{ isEditing ? 'Edit Variable' : 'Create New Variable' }}</h3>
        <form @submit.prevent="submitForm" class="variable-form">
          <div class="form-group">
            <label for="name">Name</label>
            <input
              type="text"
              id="name"
              v-model="newVariable.name"
              required
              placeholder="Enter variable name"
            />
          </div>
          <div class="form-group">
            <label for="description">Description</label>
            <textarea
              id="description"
              v-model="newVariable.description"
              placeholder="Enter variable description"
            ></textarea>
          </div>
          <div class="form-actions">
            <button type="submit" :disabled="loading">
              {{ loading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Variable' : 'Create Variable') }}
            </button>
            <button type="button" v-if="isEditing" @click="cancelEdit" class="btn-cancel">
              Cancel
            </button>
          </div>
        </form>
      </div>

      <!-- Variables List -->
      <div class="list-panel">
        <h3>Your Variables</h3>
        <div v-if="loading" class="loading">Loading variables...</div>
        <div v-else-if="error" class="error">{{ error }}</div>
        <div v-else-if="variables.length === 0" class="empty">No variables created yet</div>
        <div v-else class="variable-grid">
          <div v-for="variable in variables" :key="variable.id" class="variable-card">
            <h4>{{ variable.name }}</h4>
            <p>{{ variable.description }}</p>
            <div class="variable-actions">
              <button @click="editVariable(variable)" class="btn-edit">Edit</button>
              <button @click="deleteVariable(variable.id)" class="btn-delete">Delete</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const variables = ref([])
const loading = ref(false)
const error = ref('')
const isEditing = ref(false)
const editingId = ref(null)

const newVariable = ref({
  name: '',
  description: ''
})

const fetchVariables = async () => {
  loading.value = true
  error.value = ''
  try {
    const response = await axios.get('/variables')
    variables.value = response.data
  } catch (err) {
    error.value = 'Failed to fetch variables'
    console.error('Error fetching variables:', err)
  } finally {
    loading.value = false
  }
}

const submitForm = async () => {
  loading.value = true
  error.value = ''
  try {
    if (isEditing.value && editingId.value !== null) {
      await axios.put(`/variable/${editingId.value}`, newVariable.value)
    } else {
      await axios.post('/variable', newVariable.value)
    }
    newVariable.value = { name: '', description: '' }
    isEditing.value = false
    editingId.value = null
    await fetchVariables()
  } catch (err) {
    error.value = isEditing.value ? 'Failed to update variable' : 'Failed to create variable'
    console.error('Error submitting variable:', err)
  } finally {
    loading.value = false
  }
}

const editVariable = (variable) => {
  newVariable.value = {
    name: variable.name,
    description: variable.description || ''
  }
  editingId.value = variable.id
  isEditing.value = true
}

const cancelEdit = () => {
  isEditing.value = false
  editingId.value = null
  newVariable.value = { name: '', description: '' }
}

const deleteVariable = async (id) => {
  if (!confirm('Are you sure you want to delete this variable?')) return

  loading.value = true
  error.value = ''
  try {
    await axios.delete(`/variable/${id}`)
    await fetchVariables()
  } catch (err) {
    error.value = 'Failed to delete variable'
    console.error('Error deleting variable:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchVariables()
})
</script>

<style scoped>
.variables-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

.layout {
  display: flex;
  gap: 2rem;
  align-items: flex-start;
}

.form-panel {
  flex: 1;
  padding: 2rem;
  background-color: #f8f9fa;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.list-panel {
  flex: 2;
}

.variable-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

input, textarea {
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

textarea {
  min-height: 100px;
  resize: vertical;
}

.form-actions {
  display: flex;
  gap: 1rem;
}

button {
  padding: 0.75rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

button[type="submit"] {
  background-color: #2c3e50;
  color: white;
}

.btn-cancel {
  background-color: #6c757d;
  color: white;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.variable-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;
}

.variable-card {
  padding: 1.5rem;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.variable-card h4 {
  margin: 0 0 0.5rem 0;
  color: #2c3e50;
}

.variable-card p {
  margin: 0 0 1rem 0;
  color: #666;
}

.variable-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-edit {
  background-color: #42b983;
  color: white;
}

.btn-delete {
  background-color: #dc3545;
  color: white;
}

.loading, .error, .empty {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.error {
  color: #dc3545;
}
</style>