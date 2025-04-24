<template>
  <div class="landing-container">
    <div class="landing-panel">
      <div class="branding">
        <h1>CausalPatterns</h1>
        <p class="tagline">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
      </div>
      <div class="auth-form">
        <div class="form-group">
          <label for="email">Email</label>
          <input 
            type="email" 
            id="email" 
            v-model="email" 
            placeholder="Enter your email"
          >
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input 
            type="password" 
            id="password" 
            v-model="password" 
            placeholder="Enter your password"
          >
        </div>
        <div class="button-group">
          <button @click="login" class="btn-login">Login</button>
          <button @click="goToRegister" class="btn-register">Register</button>
        </div>
        <div v-if="error" class="error-message">{{ error }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()
const email = ref('')
const password = ref('')
const error = ref('')

const login = async () => {
  try {
    const response = await axios.post('/login', {
      email: email.value,
      password: password.value
    })

    if (response.data.token) {
      localStorage.setItem('token', response.data.token)
      router.push('/dashboard')
    }
  } catch (err) {
    error.value = err.response?.data?.message || 'Login failed'
  }
}

const goToRegister = () => {
  router.push('/register')
}
</script>

<style scoped>
.landing-container {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(to right, #f5f7fa, #e2e8f0);
  padding: 2rem;
}

.landing-panel {
  background-color: white;
  border-radius: 16px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  display: flex;
  max-width: 960px;
  width: 100%;
  padding: 3rem;
  gap: 3rem;
  align-items: center;
  justify-content: space-between;
}

.branding {
  flex: 1;
  padding-right: 2rem;
  border-right: 1px solid #e2e8f0;
}

.branding h1 {
  font-size: 3rem;
  color: #2c3e50;
  margin-bottom: 1rem;
}

.tagline {
  font-size: 1.25rem;
  color: #6b7280;
}

.auth-form {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

label {
  font-weight: 600;
  color: #374151;
}

input {
  padding: 0.75rem;
  border: 2px solid #d1d5db;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
}

input:focus {
  outline: none;
  border-color: #42b983;
}

.button-group {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

button {
  flex: 1;
  padding: 0.75rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease, transform 0.2s ease;
}

.btn-login {
  background-color: #42b983;
  color: white;
}

.btn-login:hover {
  background-color: #36966b;
  transform: translateY(-2px);
}

.btn-register {
  background-color: #2c3e50;
  color: white;
}

.btn-register:hover {
  background-color: #1a252f;
  transform: translateY(-2px);
}

.error-message {
  color: #dc3545;
  text-align: center;
  font-size: 0.95rem;
}
</style>
