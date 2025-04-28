<template>
  <div class="cld-detail-container">
    <NavBar />
    <div class="cld-content">
      <div v-if="loading" class="loading">Loading CLD...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else class="cld-details">
        <h1>{{ cld.name }}</h1>
        <p class="description">{{ cld.description }}</p>
        <div class="cld-meta">
          <span class="date">Created: {{ formatDate(cld.date) }}</span>
          <span class="variables-count">{{ cld.variables.length }} variables</span>
        </div>
        
        <div class="cld-actions">
          <button @click="goBack" class="btn-back">Back</button>
          <button @click="editCLD" class="btn-edit">Edit</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import NavBar from '../components/NavBar.vue'

const route = useRoute()
const router = useRouter()
const cld = ref({})
const loading = ref(true)
const error = ref('')

const fetchCLD = async () => {
  try {
    const response = await axios.get(`/cld/${route.params.id}`)
    cld.value = response.data
  } catch (err) {
    error.value = 'Failed to fetch CLD details'
    console.error('Error fetching CLD:', err)
  } finally {
    loading.value = false
  }
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString()
}

const goBack = () => {
  router.go(-1)
}

const editCLD = () => {
  router.push(`/cld/${route.params.id}/edit`)
}

onMounted(() => {
  fetchCLD()
})
</script>

<style scoped>
.cld-detail-container {
  min-height: 100vh;
  background-color: #f5f7fa;
}

.cld-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.cld-details {
  background-color: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

h1 {
  color: #1a252f;
  margin-bottom: 1rem;
}

.description {
  color: #555;
  margin-bottom: 1.5rem;
}

.cld-meta {
  display: flex;
  gap: 1rem;
  color: #888;
  margin-bottom: 2rem;
}

.cld-actions {
  display: flex;
  gap: 1rem;
}

button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-back {
  background-color: #6c757d;
  color: white;
}

.btn-back:hover {
  background-color: #5a6268;
}

.btn-edit {
  background-color: #42b983;
  color: white;
}

.btn-edit:hover {
  background-color: #3aa876;
}

.loading, .error {
  text-align: center;
  padding: 2rem;
  font-size: 1.1rem;
}

.error {
  color: #dc3545;
}
</style> 