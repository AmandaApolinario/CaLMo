<template>
  <div class="home-container">
    <h1>Welcome to Causal Loop Diagram App</h1>
    <div class="features">
      <div class="feature-card">
        <h3>Variables Management</h3>
        <p>Create and manage variables for your causal loop diagrams</p>
      </div>
      <div class="feature-card">
        <h3>CLD Creation</h3>
        <p>Build and visualize complex causal loop diagrams</p>
      </div>
      <div class="feature-card">
        <h3>Analysis Tools</h3>
        <p>Identify feedback loops and archetypes in your diagrams</p>
      </div>
    </div>
    <div class="cta-buttons">
      <router-link to="/login" class="btn primary">Login</router-link>
      <router-link to="/register" class="btn secondary">Register</router-link>
    </div>
  </div>
</template>

<script setup>
// No additional logic needed for the home view
</script>

<style scoped>
.home-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

h1 {
  margin-bottom: 2rem;
  color: #2c3e50;
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
}

.feature-card {
  padding: 2rem;
  background-color: #f8f9fa;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.feature-card h3 {
  color: #2c3e50;
  margin-bottom: 1rem;
}

.cta-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  text-decoration: none;
  font-weight: bold;
  transition: background-color 0.3s;
}

.btn.primary {
  background-color: #2c3e50;
  color: white;
}

.btn.secondary {
  background-color: #42b983;
  color: white;
}

.btn:hover {
  opacity: 0.9;
}
</style> 