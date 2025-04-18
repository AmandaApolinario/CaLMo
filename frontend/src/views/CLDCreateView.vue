<template>
  <div class="create-cld-container">
    <div class="header">
      <h1>Create New CLD</h1>
      <button @click="goToDashboard" class="btn-back">Back to Dashboard</button>
    </div>

    <div class="form-container">
      <form @submit.prevent="createCLD" class="cld-form">
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

        <div class="form-actions">
          <button type="submit" class="btn-submit">Create CLD</button>
          <button type="button" @click="goToDashboard" class="btn-cancel">Cancel</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()
const cld = ref({
  name: '',
  description: ''
})

const createCLD = async () => {
  try {
    const response = await axios.post('/cld', cld.value)
    if (response.data.id) {
      router.push(`/cld/${response.data.id}`)
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

input, textarea {
  padding: 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
}

input:focus, textarea:focus {
  outline: none;
  border-color: #42b983;
}

textarea {
  resize: vertical;
  min-height: 100px;
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