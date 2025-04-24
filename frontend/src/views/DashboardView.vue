<template>
  <div class="dashboard-container">
    <div class="dashboard-header">
      <h1>Dashboard</h1>
      <button @click="logout" class="btn-logout">Logout</button>
    </div>

    <div class="dashboard-grid">
      <div class="dashboard-card" @click="goToVariables">
        <h2>Variables</h2>
        <p>Define and manage your system variables</p>
        <button class="card-btn">Manage Variables</button>
      </div>

      <div class="dashboard-card" @click="createNewCLD">
        <h2>Create CLD</h2>
        <p>Design a new Causal Loop Diagram</p>
        <button class="card-btn">Create New</button>
      </div>

      <div class="dashboard-card" @click="viewCLDs">
        <h2>My CLDs</h2>
        <p>Access and manage your saved diagrams</p>
        <button class="card-btn">View CLDs</button>
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
  padding: 3rem 5%;
  background-color: #f8fafc;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.dashboard-header h1 {
  font-size: 2.8rem;
  color: #1e293b;
  margin: 0;
}

.btn-logout {
  background-color: #dc3545;
  color: white;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.3s ease, transform 0.2s ease;
}

.btn-logout:hover {
  background-color: #c82333;
  transform: translateY(-2px);
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
}

.dashboard-card {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 6px 10px rgba(0, 0, 0, 0.06);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  cursor: pointer;
}

.dashboard-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 14px rgba(0, 0, 0, 0.1);
}

.dashboard-card h2 {
  font-size: 1.6rem;
  margin-bottom: 0.5rem;
  color: #0f172a;
}

.dashboard-card p {
  flex-grow: 1;
  color: #475569;
  margin-bottom: 1.5rem;
}

.card-btn {
  background-color: #42b983;
  color: white;
  padding: 0.75rem;
  font-weight: bold;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.3s ease;
}

.card-btn:hover {
  background-color: #3aa876;
}
</style>