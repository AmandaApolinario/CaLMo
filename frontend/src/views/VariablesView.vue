<template>
  <div class="variables-container">
    <h2>Variables Management</h2>
    
    <!-- Create Variable Form -->
    <div class="create-variable">
      <h3>Create New Variable</h3>
      <form @submit.prevent="createVariable" class="variable-form">
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
            required
            placeholder="Enter variable description"
          ></textarea>
        </div>
        <button type="submit" :disabled="loading">
          {{ loading ? 'Creating...' : 'Create Variable' }}
        </button>
      </form>
    </div>

    <!-- Variables List -->
    <div class="variables-list">
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
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const variables = ref([])
const loading = ref(false)
const error = ref('')
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

const createVariable = async () => {
  loading.value = true
  error.value = ''
  try {
    await axios.post('/variable', newVariable.value)
    newVariable.value = { name: '', description: '' }
    await fetchVariables()
  } catch (err) {
    error.value = 'Failed to create variable'
    console.error('Error creating variable:', err)
  } finally {
    loading.value = false
  }
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

const editVariable = (variable) => {
  // TODO: Implement edit functionality
  console.log('Edit variable:', variable)
}

onMounted(() => {
  fetchVariables()
})
</script>

<style scoped>
.variables-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.create-variable {
  margin-bottom: 3rem;
  padding: 2rem;
  background-color: #f8f9fa;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.variables-list {
  margin-top: 2rem;
}

.variable-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
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