<template>
  <div class="clds-container">
    <h2>Causal Loop Diagrams</h2>
    
    <!-- Create CLD Form -->
    <div class="create-cld">
      <h3>Create New CLD</h3>
      <form @submit.prevent="createCLD" class="cld-form">
        <div class="form-group">
          <label for="name">Name</label>
          <input
            type="text"
            id="name"
            v-model="newCLD.name"
            required
            placeholder="Enter CLD name"
          />
        </div>
        <div class="form-group">
          <label for="description">Description</label>
          <textarea
            id="description"
            v-model="newCLD.description"
            required
            placeholder="Enter CLD description"
          ></textarea>
        </div>
        <div class="form-group">
          <label for="date">Date</label>
          <input
            type="date"
            id="date"
            v-model="newCLD.date"
            required
          />
        </div>
        <button type="submit" :disabled="loading">
          {{ loading ? 'Creating...' : 'Create CLD' }}
        </button>
      </form>
    </div>

    <!-- CLDs List -->
    <div class="clds-list">
      <h3>Your CLDs</h3>
      <div v-if="loading" class="loading">Loading CLDs...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else-if="clds.length === 0" class="empty">No CLDs created yet</div>
      <div v-else class="cld-grid">
        <div v-for="cld in clds" :key="cld.id" class="cld-card">
          <h4>{{ cld.name }}</h4>
          <p>{{ cld.description }}</p>
          <p class="date">Created: {{ formatDate(cld.date) }}</p>
          <div class="cld-actions">
            <router-link :to="`/cld/${cld.id}`" class="btn-view">View</router-link>
            <button @click="editCLD(cld)" class="btn-edit">Edit</button>
            <button @click="deleteCLD(cld.id)" class="btn-delete">Delete</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const clds = ref([])
const loading = ref(false)
const error = ref('')
const newCLD = ref({
  name: '',
  description: '',
  date: new Date().toISOString().split('T')[0]
})

const fetchCLDs = async () => {
  loading.value = true
  error.value = ''
  try {
    const response = await axios.get('/clds')
    clds.value = response.data
  } catch (err) {
    error.value = 'Failed to fetch CLDs'
    console.error('Error fetching CLDs:', err)
  } finally {
    loading.value = false
  }
}

const createCLD = async () => {
  loading.value = true
  error.value = ''
  try {
    await axios.post('/cld', {
      ...newCLD.value,
      variables: [],
      relationships: []
    })
    newCLD.value = {
      name: '',
      description: '',
      date: new Date().toISOString().split('T')[0]
    }
    await fetchCLDs()
  } catch (err) {
    error.value = 'Failed to create CLD'
    console.error('Error creating CLD:', err)
  } finally {
    loading.value = false
  }
}

const deleteCLD = async (id) => {
  if (!confirm('Are you sure you want to delete this CLD?')) return
  
  loading.value = true
  error.value = ''
  try {
    await axios.delete(`/cld/${id}`)
    await fetchCLDs()
  } catch (err) {
    error.value = 'Failed to delete CLD'
    console.error('Error deleting CLD:', err)
  } finally {
    loading.value = false
  }
}

const editCLD = (cld) => {
  // TODO: Implement edit functionality
  console.log('Edit CLD:', cld)
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString()
}

onMounted(() => {
  fetchCLDs()
})
</script>

<style scoped>
.clds-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.create-cld {
  margin-bottom: 3rem;
  padding: 2rem;
  background-color: #f8f9fa;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.cld-form {
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

button, .btn-view {
  padding: 0.75rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  text-decoration: none;
  text-align: center;
}

button[type="submit"] {
  background-color: #2c3e50;
  color: white;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.clds-list {
  margin-top: 2rem;
}

.cld-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;
}

.cld-card {
  padding: 1.5rem;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.cld-card h4 {
  margin: 0 0 0.5rem 0;
  color: #2c3e50;
}

.cld-card p {
  margin: 0 0 0.5rem 0;
  color: #666;
}

.cld-card .date {
  font-size: 0.9rem;
  color: #888;
}

.cld-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.btn-view {
  background-color: #2c3e50;
  color: white;
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