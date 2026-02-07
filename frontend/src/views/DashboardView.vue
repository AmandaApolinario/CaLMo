<template>
  <div>
    <DashboardNavBar />
    <div class="dashboard-container">
      <div class="dashboard-header">
        <h1>Dashboard</h1>
        <button @click="goToGettingStarted" class="btn-help" aria-label="Help">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286zm1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94z"/>
          </svg>
        </button>
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

      <!-- User Instructions Section -->
      <div class="instructions-container">
        <h2>Getting Started with CaLMo</h2>
        <div class="instructions-content">
          <div class="instruction-block">
            <h3>New to Causal Loop Diagrams?</h3>
            <ol>
              <li><strong>Step 1:</strong> Start by creating variables in the "Variables" section. These are the building blocks of your diagrams.</li>
              <li><strong>Step 2:</strong> Once you have variables defined, create a new CLD to establish relationships between them.</li>
              <li><strong>Step 3:</strong> View your CLDs to analyze feedback loops and system archetypes.</li>
            </ol>
          </div>

          <div class="instruction-block">
            <h3>Creating Effective CLDs</h3>
            <ul>
              <li><strong>To model a simple process:</strong> Create variables for each key component of you problem or organization, then use "Create CLD" to establish causal relationships.</li>
              <li><strong>To identify feedback loops:</strong> Create a CLD with interconnected variables and visit the CLD detail page to analyze loops.</li>
              <li><strong>To understand system behavior:</strong> Look for archetypes in your CLDs that explain recurring patterns.</li>
            </ul>
          </div>

          <div class="instruction-block">
            <h3>Working with Relationships</h3>
            <ul>
              <li><strong>Positive relationship (+):</strong> When variable A increases, variable B also increases (or when A decreases, B decreases).</li>
              <li><strong>Negative relationship (-):</strong> When variable A increases, variable B decreases (or when A decreases, B increases).</li>
              <li><strong>Direction matters:</strong> A→B is different from B→A. Consider carefully which variable causes a change in the other.</li>
            </ul>
          </div>
        </div>
        <div class="learn-more">
          <button @click="goToGettingStarted" class="btn-learn-more">
            Learn More About Causal Loop Diagrams
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAuthViewModel } from '@/viewmodels/AuthViewModel'
import { onMounted } from 'vue'
import DashboardNavBar from '../components/DashboardNavBar.vue'

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

const goToGettingStarted = () => {
  router.push('/getting-started')
}
</script>

<style scoped>
.dashboard-container {
  min-height: calc(100vh - 60px); /* Adjust for navbar height */
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

.btn-help {
  background-color: transparent;
  color: #42b983;
  border: 2px solid #42b983;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-help:hover {
  background-color: #42b983;
  color: white;
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

.instructions-container {
  max-width: 1400px;
  margin: 3rem auto 0;
  background-color: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}

.instructions-container h2 {
  font-size: 1.6rem;
  color: #1a252f;
  margin: 0 0 1.5rem 0;
  font-weight: 600;
  text-align: center;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e2e8f0;
}

.instructions-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.instruction-block {
  margin-bottom: 1.5rem;
}

.instruction-block h3 {
  font-size: 1.2rem;
  color: #1a252f;
  margin: 0 0 1rem 0;
  font-weight: 600;
}

.instruction-block ol, .instruction-block ul {
  padding-left: 1.5rem;
  margin: 0;
}

.instruction-block li {
  margin-bottom: 0.8rem;
  line-height: 1.6;
  color: #4a5568;
}

.instruction-block strong {
  color: #42b983;
  font-weight: 600;
}

.learn-more {
  text-align: center;
  margin-top: 2rem;
}

.btn-learn-more {
  background-color: #2c3e50;
  color: white;
  padding: 0.8rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  width: auto;
  display: inline-block;
}

.btn-learn-more:hover {
  background-color: #1a252f;
  transform: translateY(-2px);
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
  
  .instructions-content {
    grid-template-columns: 1fr;
  }
  
  .instruction-block {
    margin-bottom: 2rem;
  }
  
  .instructions-container {
    padding: 1.5rem;
  }
  
  .btn-help {
    align-self: flex-end;
  }
}
</style>