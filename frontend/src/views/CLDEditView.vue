<template>
  <div class="cld-edit-container">
    <NavBar />
    <div class="cld-edit-content">
      <h1>Edit CLD</h1>
      
      <div v-if="loading" class="loading">Loading CLD...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <form v-else @submit.prevent="updateCLD" class="cld-form">
        <!-- Basic CLD Info -->
        <div class="form-section">
          <h2>Basic Information</h2>
          <div class="form-group">
            <label for="name">CLD Name</label>
            <input
              type="text"
              id="name"
              v-model="cld.name"
              required
              placeholder="Enter CLD name"
            />
          </div>

          <div class="form-group">
            <label for="description">Description</label>
            <textarea
              id="description"
              v-model="cld.description"
              placeholder="Enter CLD description"
              rows="4"
              required
            ></textarea>
          </div>

          <div class="form-group">
            <label for="date">Date</label>
            <input
              type="date"
              id="date"
              v-model="cld.date"
              required
            />
          </div>
        </div>

        <!-- Variables Section -->
        <div class="form-section">
          <h2>Variables</h2>
          <div class="variables-list">
            <div v-for="variable in variables" :key="variable.id" class="variable-item">
              <input
                type="checkbox"
                :id="'variable-' + variable.id"
                :value="variable.id"
                v-model="cld.variables"
              />
              <label :for="'variable-' + variable.id">
                {{ variable.name }} - {{ variable.description }}
              </label>
            </div>
          </div>
        </div>

        <!-- Relationships Section -->
        <div class="form-section">
          <h2>Relationships</h2>
          <div class="relationships-list">
            <div v-for="(relationship, index) in cld.relationships" :key="index" class="relationship-item">
              <select v-model="relationship.source_id" required>
                <option v-for="variable in variables" :key="variable.id" :value="variable.id">
                  {{ variable.name }}
                </option>
              </select>
              <select v-model="relationship.type" required>
                <option value="POSITIVE">Positive</option>
                <option value="NEGATIVE">Negative</option>
              </select>
              <select v-model="relationship.target_id" required>
                <option v-for="variable in variables" :key="variable.id" :value="variable.id">
                  {{ variable.name }}
                </option>
              </select>
              <button type="button" @click="removeRelationship(index)" class="btn-delete">Remove</button>
            </div>
            <button type="button" @click="addRelationship" class="btn-add">Add Relationship</button>
          </div>
        </div>

        <!-- Form Actions -->
        <div class="form-actions">
          <button type="submit" :disabled="updating" class="btn-submit">
            {{ updating ? 'Updating...' : 'Update CLD' }}
          </button>
          <button type="button" @click="cancelEdit" class="btn-cancel">Cancel</button>
        </div>
      </form>
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
const cld = ref({
  name: '',
  description: '',
  date: '',
  variables: [],
  relationships: []
})
const variables = ref([])
const loading = ref(true)
const updating = ref(false)
const error = ref('')

const fetchCLD = async () => {
  try {
    const [cldResponse, variablesResponse] = await Promise.all([
      axios.get(`/cld/${route.params.id}`),
      axios.get('/variables')
    ])
    
    cld.value = {
      ...cldResponse.data,
      variables: cldResponse.data.variables.map(v => v.id),
      relationships: cldResponse.data.relationships
    }
    variables.value = variablesResponse.data
  } catch (err) {
    error.value = 'Failed to fetch CLD details'
    console.error('Error fetching CLD:', err)
  } finally {
    loading.value = false
  }
}

const addRelationship = () => {
  cld.value.relationships.push({
    source_id: null,
    target_id: null,
    type: 'POSITIVE'
  })
}

const removeRelationship = (index) => {
  cld.value.relationships.splice(index, 1)
}

const updateCLD = async () => {
  updating.value = true
  error.value = ''
  try {
    const response = await axios.put(`/cld/${route.params.id}`, {
      ...cld.value,
      date: new Date(cld.value.date).toISOString().split('T')[0]
    })
    router.push(`/cld/${route.params.id}`)
  } catch (err) {
    error.value = 'Failed to update CLD'
    console.error('Error updating CLD:', err)
  } finally {
    updating.value = false
  }
}

const cancelEdit = () => {
  router.push(`/cld/${route.params.id}`)
}

onMounted(() => {
  fetchCLD()
})
</script>

<style scoped>
.cld-edit-container {
  min-height: 100vh;
  background-color: #f5f7fa;
}

.cld-edit-content {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

h1 {
  color: #1a252f;
  margin-bottom: 2rem;
}

.cld-form {
  background-color: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 1.5rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  color: #1a252f;
  font-weight: 500;
}

input, textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
}

textarea {
  min-height: 150px;
  resize: vertical;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-submit {
  background-color: #42b983;
  color: white;
}

.btn-submit:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.btn-cancel {
  background-color: #6c757d;
  color: white;
}

.loading, .error {
  text-align: center;
  padding: 2rem;
  font-size: 1.1rem;
}

.error {
  color: #dc3545;
}

.form-section {
  margin-bottom: 2rem;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.variables-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

.variable-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.relationships-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.relationship-item {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.btn-add {
  background-color: #42b983;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-delete {
  background-color: #dc3545;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style> 