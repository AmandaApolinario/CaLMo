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
            required
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
          <div v-for="(relationship, index) in cld.variable_clds" :key="index" class="variable-relationship">
            <select v-model="relationship.from_variable_id" required>
              <option v-for="variable in variables" :key="variable.id" :value="variable.id">
                {{ variable.name }} - {{ variable.description }}
              </option>
            </select>
            <select v-model="relationship.to_variable_id" required :disabled="relationship.from_variable_id === relationship.to_variable_id">
              <option v-for="variable in variables" :key="variable.id" :value="variable.id">
                {{ variable.name }} - {{ variable.description }}
              </option>
            </select>
            <select v-model="relationship.type" required>
              <option value="Positive">Positive</option>
              <option value="Negative">Negative</option>
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
    const requestData = {
      name: cld.value.name,
      date: cld.value.date,
      description: cld.value.description,
      variable_clds: cld.value.variable_clds
    }

    // Log the request data to the console before sending the POST request
    console.log('Request Body:', JSON.stringify(requestData, null, 2))

    const response = await axios.post('/cld', requestData)
    if (response.data.id) {
      router.push(`/cld/${response.data.id}`)
      console.log('CLD created successfully:', response.data)
    }
  } catch (err) {
    console.error('Error creating CLD:', err)
  }
}

const goToDashboard = () => {
  router.push('/dashboard')
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

.variable-relationship {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.variable-relationship select {
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
</style>

