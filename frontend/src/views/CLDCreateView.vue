<template>
  <div class="create-cld-container">
    <div class="header">
      <h1>Create New CLD</h1>
      <button @click="goToDashboard" class="btn-back">Back to Dashboard</button>
    </div>

    <div class="form-container">
      <form @submit.prevent="createCLD" class="cld-form">
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
            rows="4"
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

        <!-- Variable Relationships -->
        <div class="form-group">
          <label>Variable Relationships</label>
          <div v-for="(relationship, index) in cld.variable_clds" :key="index" class="relationship">
            <select v-model="relationship.from_variable_id" required>
              <option v-for="variable in variables" :key="variable.id" :value="variable.id">
                {{ variable.name }} - {{ variable.description }}
              </option>
            </select>
            <select v-model="relationship.type" required>
              <option value="Positive">Positive</option>
              <option value="Negative">Negative</option>
            </select>
            <select v-model="relationship.to_variable_id" required>
              <option v-for="variable in filteredTargets(relationship.from_variable_id)" 
                      :key="variable.id" 
                      :value="variable.id">
                {{ variable.name }} - {{ variable.description }}
              </option>
            </select>
            <button type="button" @click="removeRelationship(index)">Remove</button>
          </div>
          <button type="button" @click="addRelationship">Add Relationship</button>
        </div>

        <!-- Submit and Cancel -->
        <div class="form-actions">
          <button type="submit" class="btn-submit">Create CLD</button>
          <button type="button" @click="goToDashboard" class="btn-cancel">Cancel</button>
        </div>
      </form>

      <!-- Add messages here with proper positioning -->
      <div class="messages-container">
        <div v-if="successMessage" class="success-message">
          {{ successMessage }}
        </div>
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
      </div>
    </div>

    <!-- Popup for success message -->
    <div v-if="showPopup" class="popup-overlay">
      <div class="popup-content">
        <div class="popup-message">
          {{ successMessage }}
        </div>
        <button @click="closePopup" class="popup-close">OK</button>
      </div>
    </div>

    <!-- Popup for error message -->
    <div v-if="error" class="popup-overlay">
      <div class="popup-content error">
        <div class="popup-message">
          {{ error }}
        </div>
        <button @click="error = ''" class="popup-close">OK</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

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

// Add showPopup ref
const showPopup = ref(false)

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
    showPopup.value = false

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

    // Detailed logging
    console.log('Request Data:', JSON.stringify(requestData, null, 2))
    console.log('CLD Name:', requestData.name)
    console.log('CLD Date:', requestData.date)
    console.log('CLD Description:', requestData.description)
    console.log('Variables:', requestData.variables)
    console.log('Relationships:', requestData.relationships)

    const response = await axios.post('/cld', requestData)
    console.log("cld created")
    if (response.data.id) {
      console.log(response.data.id)
      successMessage.value = 'CLD created successfully!'
      showPopup.value = true
      setTimeout(() => {
        router.push(`/cld/${response.data.id}`)
      }, 2000) // Redirect after 2 seconds
    }
  } catch (err) {
    error.value = 'Failed to create CLD: ' + (err.response?.data?.message || err.message)
    console.error('Error creating CLD:', err)
    if (err.response) {
      console.error('Response data:', err.response.data)
      console.error('Response status:', err.response.status)
      console.error('Response headers:', err.response.headers)
    }
  }
}

const goToDashboard = () => {
  router.push('/dashboard')
}

// Update the filteredTargets function
const filteredTargets = (sourceId) => {
  if (!sourceId) return variables.value
  return variables.value.filter(v => v.id !== sourceId)
}

// Add validation before submission
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
  
  // ... rest of existing submitForm code ...
}

// Add closePopup function
const closePopup = () => {
  showPopup.value = false
}
</script>

<style scoped>
.create-cld-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3rem;
}

h1 {
  font-size: 2.5rem;
  color: #1a252f;
  margin: 0;
}

.form-container {
  background-color: white;
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
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
  padding: 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
}

input:focus, textarea:focus, select:focus {
  outline: none;
  border-color: #42b983;
}

textarea {
  resize: vertical;
  min-height: 100px;
}

.relationship {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1rem;
}

.relationship select {
  width: 30%;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

button {
  padding: 1rem 2rem;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-submit {
  background-color: #42b983;
  color: white;
  flex: 1;
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

.btn-back {
  background-color: #2c3e50;
  color: white;
}

.btn-back:hover {
  background-color: #1a252f;
  transform: translateY(-2px);
}

.relationship {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1rem;
}

select {
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.btn-delete {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

/* Update message styles to make them more visible */
.messages-container {
  margin-top: 2rem;
}

.success-message {
  background-color: #d4edda;
  color: #155724;
  padding: 1rem;
  border-radius: 4px;
  margin: 1rem 0;
  border: 1px solid #c3e6cb;
  font-size: 1rem;
  text-align: center;
}

.error-message {
  background-color: #f8d7da;
  color: #721c24;
  padding: 1rem;
  border-radius: 4px;
  margin: 1rem 0;
  border: 1px solid #f5c6cb;
  font-size: 1rem;
  text-align: center;
}

/* Ensure messages are visible above other content */
.messages-container {
  position: relative;
  z-index: 10;
}

/* Popup styles */
.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.popup-content {
  background-color: white;
  padding: 2rem;
  border-radius: 8px;
  width: 400px;
  max-width: 90%;
  text-align: center;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.popup-content.error {
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
}

.popup-message {
  font-size: 1.2rem;
  margin-bottom: 1.5rem;
  color: #155724;
}

.popup-content.error .popup-message {
  color: #721c24;
}

.popup-close {
  background-color: #42b983;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.3s ease;
}

.popup-content.error .popup-close {
  background-color: #dc3545;
}

.popup-close:hover {
  opacity: 0.9;
}
</style>

