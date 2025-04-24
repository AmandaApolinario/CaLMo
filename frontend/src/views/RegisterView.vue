<template>
  <div class="register-layout">
    <div class="register-branding">
      <h1>CausalPatterns</h1>
      <p>Create an account to Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
    </div>
    <div class="register-container">
      <h2>Create Account</h2>
      <form @submit.prevent="handleRegister" class="register-form">
        <div class="form-group">
          <label for="name">Name</label>
          <input
            type="text"
            id="name"
            v-model="name"
            required
            placeholder="Enter your name"
          />
        </div>
        <div class="form-group">
          <label for="email">Email</label>
          <input
            type="email"
            id="email"
            v-model="email"
            required
            placeholder="Enter your email"
          />
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input
            type="password"
            id="password"
            v-model="password"
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
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const name = ref('')
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const router = useRouter()
const authStore = useAuthStore()

const handleRegister = async () => {
  loading.value = true
  error.value = ''

  try {
    const success = await authStore.register(name.value, email.value, password.value)
    if (success) {
      router.push('/dashboard')
    } else {
      error.value = 'Registration failed'
    }
  } catch (err) {
    error.value = 'An error occurred during registration'
  } finally {
    loading.value = false
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

.register-branding h1 {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.register-branding p {
  font-size: 1.2rem;
  max-width: 300px;
  text-align: center;
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

.login-link {
  text-align: center;
  font-size: 0.95rem;
}
</style>
