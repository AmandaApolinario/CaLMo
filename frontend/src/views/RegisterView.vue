<template>
  <div class="register-layout">
    <div class="register-branding">
      <div class="branding">
        <h1>CaLMo 2.0</h1>
        <p class="subtitle">Causal Loop Diagram Modeler</p>
        <p class="tagline">Create your account to start modeling.</p>
      </div>
    </div>
    <div class="register-container">
      <h2>Create Account</h2>
      <div v-if="successMessage" class="success-message">
        {{ successMessage }}
        <p>Redirecting to login page...</p>
      </div>
      <form v-else @submit.prevent="handleRegister" class="register-form">
        <div class="form-group">
          <label for="name">Name</label>
          <input
            type="text"
            id="name"
            v-model="userData.name"
            required
            placeholder="Enter your name"
          />
        </div>
        <div class="form-group">
          <label for="email">Email</label>
          <input
            type="email"
            id="email"
            v-model="userData.email"
            required
            placeholder="Enter your email"
          />
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input
            type="password"
            id="password"
            v-model="userData.password"
            required
            placeholder="Enter your password"
          />
        </div>
        <button type="submit" :disabled="loading">
          {{ loading ? 'Registering...' : 'Register' }}
        </button>
        <p class="error-message" v-if="error">{{ error }}</p>
        <p class="login-link">
          Already have an account? <router-link to="/">Login here</router-link>
        </p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthViewModel } from '@/viewmodels/AuthViewModel'

// Initialize router
const router = useRouter()

// Initialize the AuthViewModel
const { loading, error, successMessage, register } = useAuthViewModel()

// Create a reactive object for form data
const userData = reactive({
  name: '',
  email: '',
  password: ''
})

const handleRegister = async () => {
  console.log('Registering with data:', userData);
  const success = await register(userData);
  if (success) {
    // Redirect to login page after a short delay so user can see success message
    setTimeout(() => {
      router.push('/');
    }, 2000);
  }
}
</script>

<style scoped>
.register-layout {
  display: flex;
  min-height: 100vh;
  background-color: #f5f7fa;
}

.register-branding {
  flex: 1;
  background-color: #2c3e50;
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 3rem;
}

.branding {
  text-align: center;
}

.branding h1 {
  font-size: 3rem;
  color: white;
  margin-bottom: 0.5rem;
}

.subtitle {
  font-size: 1.2rem;
  color: #42b983;
  margin-bottom: 1rem;
  font-weight: 500;
}

.tagline {
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.8);
}

.register-container {
  flex: 1;
  padding: 4rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background-color: white;
}

.register-form {
  max-width: 400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

input {
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 1rem;
}

button {
  padding: 1rem;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.error-message {
  color: red;
  text-align: center;
  font-size: 0.95rem;
}

.success-message {
  color: #42b983;
  background-color: #e0f2e9;
  padding: 1.5rem;
  border-radius: 8px;
  text-align: center;
  font-size: 1.1rem;
  font-weight: 500;
  margin: 0 auto;
  max-width: 400px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.success-message p {
  font-size: 0.9rem;
  margin-top: 0.5rem;
  color: #767676;
}

.login-link {
  text-align: center;
  font-size: 0.95rem;
}
</style>
