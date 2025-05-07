<template>
  <div class="dashboard-container">
    <div class="dashboard-header">
      <h1>Dashboard</h1>
      <button @click="handleLogout" class="btn-logout">Logout</button>
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
import { useAuthViewModel } from '@/viewmodels/AuthViewModel'
import { onMounted } from 'vue'

// Initialize router
const router = useRouter()

// Initialize the AuthViewModel
const { logout, isAuthenticated } = useAuthViewModel()

// Check authentication on mount
onMounted(() => {
  if (!isAuthenticated.value) {
    router.push('/')
  }
})

const handleLogout = async () => {
  await logout()
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
  background-color: #f5f7fa;
  padding: 2rem;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  max-width: 1400px;
  margin: 0 auto;
}

.dashboard-header h1 {
  font-size: 2.5rem;
  color: #1a252f;
  margin: 0;
  font-weight: 600;
}

.btn-logout {
  background-color: #dc3545;
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-logout:hover {
  background-color: #c82333;
  transform: translateY(-2px);
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
  gap: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.dashboard-card {
  background-color: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  border: 1px solid #e2e8f0;
}

.dashboard-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
  border-color: #cbd5e0;
}

.dashboard-card h2 {
  font-size: 1.4rem;
  color: #1a252f;
  margin: 0 0 1rem 0;
  font-weight: 600;
}

.dashboard-card p {
  color: #555;
  margin: 0 0 1.5rem 0;
  line-height: 1.6;
  flex: 1;
}

.card-btn {
  background-color: #42b983;
  color: white;
  padding: 0.75rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 100%;
}

.card-btn:hover {
  background-color: #3aa876;
}

@media (max-width: 768px) {
  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .dashboard-header h1 {
    font-size: 2rem;
  }
  
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
</style>