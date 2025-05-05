<template>
  <div class="create-cld-container">
    <NavBar />
    <div class="cld-content">
      <h1>Create New CLD</h1>

      <div class="form-container">
        <form @submit.prevent="createCLD" class="cld-form">
          <div class="form-columns">
            <!-- Left Column -->
            <div class="form-left">
              <!-- CLD Name -->
              <div class="form-group">
                <label for="name">CLD Name</label>
                <input 
                  type="text" 
                  id="name" 
                  v-model="cld.name" 
                  placeholder="Enter CLD name"
                  required
                >
              </div>

              <!-- Description -->
              <div class="form-group">
                <label for="description">Description</label>
                <textarea 
                  id="description" 
                  v-model="cld.description" 
                  placeholder="Enter CLD description"
                  rows="6"
                ></textarea>
              </div>

              <!-- Date -->
              <div class="form-group">
                <label for="date">Date</label>
                <input 
                  type="date" 
                  id="date" 
                  v-model="cld.date" 
                  required
                >
              </div>
            </div>

            <!-- Right Column -->
            <div class="form-right">
              <!-- Variable Relationships -->
              <div class="form-group">
                <label>Variable Relationships</label>
                <div class="relationships-container">
                  <div v-for="(relationship, index) in cld.variable_clds" :key="index" class="relationship">
                    <div class="relationship-row">
                      <select v-model="relationship.from_variable_id" required class="relationship-select">
                        <option value="">Select source variable</option>
                        <option v-for="variable in variables" :key="variable.id" :value="variable.id">
                          {{ variable.name }}
                        </option>
                      </select>
                      
                      <select v-model="relationship.type" required class="relationship-type">
                        <option value="Positive">+ (Positive)</option>
                        <option value="Negative">- (Negative)</option>
                      </select>
                      
                      <select v-model="relationship.to_variable_id" required class="relationship-select">
                        <option value="">Select target variable</option>
                        <option v-for="variable in filteredTargets(relationship.from_variable_id)" 
                                :key="variable.id" 
                                :value="variable.id">
                          {{ variable.name }}
                        </option>
                      </select>
                      
                      <button type="button" @click="removeRelationship(index)" class="btn-delete">
                        <i class="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
                <button type="button" @click="addRelationship" class="btn-add">
                  <i class="fas fa-plus"></i> Add Relationship
                </button>
              </div>
            </div>
          </div>

          <!-- Submit and Cancel -->
          <div class="form-actions">
            <button type="button" @click="goToDashboard" class="btn-cancel">Cancel</button>
            <button type="submit" class="btn-submit">Create CLD</button>
          </div>
        </form>

        <!-- Messages -->
        <div class="messages-container">
          <div v-if="successMessage" class="success-message">
            <i class="fas fa-check-circle"></i> {{ successMessage }}
          </div>
          <div v-if="error" class="error-message">
            <i class="fas fa-exclamation-circle"></i> {{ error }}
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
import NavBar from '../components/NavBar.vue'

const router = useRouter()

// Reactive references for the CLD and the list of variables
const variables = ref([])
const cld = ref({
  name: '',
  description: '',
  date: '',
  variable_clds: []
})

// Add success message ref
const successMessage = ref('')
const error = ref('')

// Fetch variables from the API when the component is mounted
onMounted(async () => {
  try {
    const response = await axios.get('/variables')
    variables.value = response.data
  } catch (err) {
    console.error('Error fetching variables:', err)
  }
})

const addRelationship = () => {
  cld.value.variable_clds.push({
    from_variable_id: null,
    to_variable_id: null,
    type: 'Positive'
  })
}

const removeRelationship = (index) => {
  cld.value.variable_clds.splice(index, 1)
}

const createCLD = async () => {
  try {
    // Reset messages
    successMessage.value = ''
    error.value = ''

    // Prepare the request data
    const requestData = {
      name: cld.value.name,
      date: cld.value.date,
      description: cld.value.description,
      variables: cld.value.variable_clds.map(rel => rel.from_variable_id)
        .concat(cld.value.variable_clds.map(rel => rel.to_variable_id))
        .filter((value, index, self) => self.indexOf(value) === index), // Unique variables
      relationships: cld.value.variable_clds.map(rel => ({
        source_id: rel.from_variable_id,
        target_id: rel.to_variable_id,
        type: rel.type.toUpperCase()
      }))
    }

    const response = await axios.post('/cld', requestData)
    if (response.status === 201) {
      successMessage.value = 'CLD created successfully!'
      router.push('/clds')
    }
  } catch (err) {
    error.value = 'Failed to create CLD: ' + (err.response?.data?.message || err.message)
    console.error('Error creating CLD:', err)
  }
}

const goToDashboard = () => {
  router.push('/dashboard')
}

const filteredTargets = (sourceId) => {
  if (!sourceId) return variables.value
  return variables.value.filter(v => v.id !== sourceId)
}

const validateRelationships = () => {
  for (const rel of cld.value.variable_clds) {
    if (rel.from_variable_id === rel.to_variable_id) {
      return 'Cannot create relationship with the same source and target variable'
    }
  }
  return null
}

const submitForm = async () => {
  const validationError = validateRelationships()
  if (validationError) {
    error.value = validationError
    return
  }
}
</script>

<style scoped>
.create-cld-container {
  min-height: 100vh;
  background-color: #f5f7fa;
}

.cld-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

h1 {
  font-size: 2.5rem;
  color: #1a252f;
  margin-bottom: 2rem;
  text-align: center;
}

.form-container {
  background-color: white;
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.form-columns {
  display: flex;
  gap: 2rem;
}

.form-left {
  flex: 1;
  min-width: 400px;
}

.form-right {
  flex: 2;
  min-width: 600px;
}

.cld-form {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

label {
  font-size: 1.1rem;
  color: #1a252f;
  font-weight: 500;
}

input, textarea, select {
  padding: 0.75rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s ease;
  width: 100%;
}

input:focus, textarea:focus, select:focus {
  outline: none;
  border-color: #42b983;
  box-shadow: 0 0 0 3px rgba(66, 185, 131, 0.2);
}

textarea {
  resize: vertical;
  min-height: 150px;
}

.relationships-container {
  max-height: 400px;
  overflow-y: auto;
  padding: 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background-color: #f8fafc;
}

.relationship {
  margin-bottom: 1rem;
}

.relationship-row {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.relationship-select {
  flex: 2;
}

.relationship-type {
  flex: 1;
  max-width: 120px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
}

button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-submit {
  background-color: #42b983;
  color: white;
}

.btn-submit:hover {
  background-color: #3aa876;
  transform: translateY(-2px);
}

.btn-cancel {
  background-color: #e2e8f0;
  color: #1a252f;
}

.btn-cancel:hover {
  background-color: #cbd5e0;
}

.btn-add {
  background-color: #2c3e50;
  color: white;
  margin-top: 1rem;
}

.btn-add:hover {
  background-color: #1a252f;
}

.btn-delete {
  background-color: #f8f9fa;
  color: #dc3545;
  padding: 0.5rem;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-delete:hover {
  background-color: #f1f1f1;
}

.messages-container {
  margin-top: 2rem;
}

.success-message {
  background-color: #d4edda;
  color: #155724;
  padding: 1rem;
  border-radius: 8px;
  border-left: 4px solid #28a745;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.error-message {
  background-color: #f8d7da;
  color: #721c24;
  padding: 1rem;
  border-radius: 8px;
  border-left: 4px solid #dc3545;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Font Awesome icons */
.fas {
  font-size: 1.2rem;
}
</style>