<template>
  <div class="app-container">
    <nav class="navbar">
      <div class="nav-content">
        <h2>CLD Analysis Tool</h2>
        <button @click="logout" class="btn-logout">Logout</button>
      </div>
    </nav>

    <div class="cld-list-container">
      <div class="header">
        <h1>Causal Loop Diagrams</h1>
        <button @click="createNewCLD" class="btn-create">Create New CLD</button>
      </div>

      <div v-if="loading" class="loading">Loading CLDs...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else-if="clds.length === 0" class="empty">
        <p>No CLDs found. Create your first CLD!</p>
      </div>
      <div v-else class="cld-grid">
        <div v-for="cld in clds" :key="cld.id" class="cld-card">
          <div class="cld-card-content">
            <h3>{{ cld.name }}</h3>
            <p class="description">{{ cld.description }}</p>
            <div class="cld-meta">
              <span class="date">Created: {{ formatDate(cld.date) }}</span>
              <span class="variables-count">{{ cld.variables.length }} variables</span>
            </div>
          </div>
          <div class="cld-actions">
            <button @click="viewCLD(cld.id)" class="btn-view">View</button>
            <button @click="editCLD(cld.id)" class="btn-edit">Edit</button>
            <button @click="deleteCLD(cld.id)" class="btn-delete">Delete</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()
const clds = ref([])
const loading = ref(false)
const error = ref('')

const logout = () => {
  localStorage.removeItem('token')
  router.push('/')
}

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

const createNewCLD = () => {
  router.push('/cld/new')
}

const viewCLD = (id) => {
  router.push(`/cld/${id}`)
}

const editCLD = (id) => {
  router.push(`/cld/${id}/edit`)
}

const deleteCLD = async (id) => {
  if (!confirm('Are you sure you want to delete this CLD?')) return
  
  try {
    await axios.delete(`/cld/${id}`)
    clds.value = clds.value.filter(cld => cld.id !== id)
  } catch (err) {
    error.value = 'Failed to delete CLD'
    console.error('Error deleting CLD:', err)
  }
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString()
}

onMounted(() => {
  fetchCLDs()
})
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #f5f7fa;
}

.navbar {
  background-color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  padding: 1rem 0;
  margin-bottom: 2rem;
}

.nav-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.navbar h2 {
  margin: 0;
  color: #1a252f;
  font-size: 1.8rem;
}

.btn-logout {
  background-color: #dc3545;
  color: white;
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-logout:hover {
  background-color: #c82333;
  transform: translateY(-1px);
}

.cld-list-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2rem 2rem;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

h1 {
  font-size: 2.2rem;
  color: #1a252f;
  margin: 0;
}

.btn-create {
  background-color: #42b983;
  color: white;
  font-size: 1rem;
  padding: 0.9rem 1.8rem;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  transition: all 0.3s ease;
}

.btn-create:hover {
  background-color: #3aa876;
  transform: translateY(-2px);
}

.cld-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
  gap: 1.5rem;
}

.cld-card {
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease;
}

.cld-card:hover {
  transform: translateY(-4px);
}

.cld-card-content {
  padding: 1.5rem 2rem;
  flex: 1;
}

.cld-card h3 {
  font-size: 1.3rem;
  color: #1a252f;
  margin: 0 0 0.75rem 0;
}

.description {
  color: #555;
  margin-bottom: 1.2rem;
  line-height: 1.5;
}

.cld-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: #888;
}

.cld-actions {
  display: flex;
  justify-content: space-around;
  padding: 1rem;
  border-top: 1px solid #eee;
  background-color: #f8f9fa;
  gap: 0.5rem;
}

button {
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.95rem;
}

.btn-view {
  background-color: #2c3e50;
  color: white;
}
.btn-view:hover {
  background-color: #1a252f;
}

.btn-edit {
  background-color: #42b983;
  color: white;
}
.btn-edit:hover {
  background-color: #3aa876;
}

.btn-delete {
  background-color: #dc3545;
  color: white;
}
.btn-delete:hover {
  background-color: #c82333;
}

.loading,
.error,
.empty {
  text-align: center;
  padding: 2rem;
  font-size: 1.1rem;
  color: #666;
}

.error {
  color: #dc3545;
}
</style>
