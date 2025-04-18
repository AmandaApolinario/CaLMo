<template>
  <div class="dashboard-container">
    <div class="dashboard-header">
      <h1>Dashboard</h1>
      <button @click="logout" class="btn-logout">Logout</button>
    </div>

    <div class="dashboard-content">
      <div class="action-cards">
        <div class="action-card" @click="goToVariables">
          <h2>Variables</h2>
          <p>Manage your system variables</p>
          <button class="btn-action">Manage Variables</button>
        </div>

        <div class="action-card" @click="createNewCLD">
          <h2>Create CLD</h2>
          <p>Create a new Causal Loop Diagram</p>
          <button class="btn-action">Create New</button>
        </div>

        <div class="action-card" @click="viewCLDs">
          <h2>My CLDs</h2>
          <p>View and manage your CLDs</p>
          <button class="btn-action">View CLDs</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const logout = () => {
  localStorage.removeItem('token')
  router.push('/')
}

const goToVariables = () => {
  router.push('/variables')
}

const createNewCLD = () => {
  router.push('/cld/new')
}

const viewCLDs = () => {
  router.push('/clds')
}
</script>

<style scoped>
.dashboard-container {
  min-height: 100vh;
  padding: 2rem;
  background-color: white;
}

.dashboard-header {
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

.btn-logout {
  background-color: #dc3545;
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-logout:hover {
  background-color: #c82333;
  transform: translateY(-2px);
}

.dashboard-content {
  max-width: 1400px;
  margin: 0 auto;
}

.action-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.action-card {
  background-color: white;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: left;
}

.action-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.action-card h2 {
  font-size: 1.8rem;
  color: #1a252f;
  margin-bottom: 1rem;
}

.action-card p {
  color: #666;
  margin-bottom: 1.5rem;
  line-height: 1.5;
}

.btn-action {
  background-color: #42b983;
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 100%;
}

.btn-action:hover {
  background-color: #3aa876;
}
</style> 