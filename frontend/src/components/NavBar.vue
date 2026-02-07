<template>
  <nav class="navbar">
    <div class="navbar-content">
      <router-link to="/dashboard" class="nav-brand">
        CaLMo
      </router-link>
      <div class="nav-links">
        <router-link to="/dashboard" class="nav-link">Home</router-link>
        <router-link to="/variables" class="nav-link">Variables</router-link>
        <router-link to="/clds" class="nav-link">CLDs</router-link>
      </div>
      <button @click="logout" class="btn-logout">Log Out</button>
    </div>
  </nav>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const logout = () => {
  localStorage.removeItem('token')
  router.push('/')
}
</script>

<style scoped>
.navbar {
  background-color: #2c3e50;
  padding: 1rem 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.navbar-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-brand {
  color: white;
  font-size: 1.5rem;
  font-weight: bold;
  text-decoration: none;
}

.nav-links {
  display: flex;
  gap: 2rem;
}

.nav-link {
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  font-size: 1rem;
  transition: color 0.3s ease;
}

.nav-link:hover {
  color: white;
}

.btn-logout {
  background-color: #dc3545;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.btn-logout:hover {
  background-color: #c82333;
}
</style> 