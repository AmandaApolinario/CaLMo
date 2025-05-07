<template>
  <div class="cld-detail-container">
    <NavBar />
    <div class="cld-content">
      <div v-if="loading" class="loading">Loading CLD...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else class="cld-details">
        <h1>{{ diagram?.title }}</h1>
        <p class="description">{{ diagram?.description }}</p>
        <div class="cld-meta">
          <span class="date">Created: {{ formatDate(diagram?.createdAt) }}</span>
          <span class="variables-count">{{ diagram?.nodes?.length || 0 }} variables</span>
        </div>
        
        <!-- Diagram Container -->
        <div class="diagram-container">
          <div class="zoom-controls">
            <button @click="zoomIn" class="zoom-button">+</button>
            <button @click="zoomOut" class="zoom-button">-</button>
          </div>
          <div ref="networkContainer" class="network"></div>
        </div>

        <div class="cld-actions">
          <button @click="goBack" class="btn-back">Back</button>
          <button @click="editDiagram" class="btn-edit">Edit</button>
        </div>
      </div>
    </div>

    <!-- Improved Archetype Popup -->
    <div v-if="selectedNodeInfo.loops.length > 0 || selectedNodeInfo.archetypes.length > 0" class="archetype-popup">
      <div class="popup-overlay" @click="clearNodeSelection"></div>
      <div class="popup-card">
        <div class="popup-header">
          <h3>Node Details</h3>
          <button @click="clearNodeSelection" class="close-button">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="popup-body">
          <!-- Added node name section here -->
          <div class="node-name-section">
            <h4 class="section-title">
              <i class="fas fa-circle"></i> Node Name
            </h4>
            <div class="node-name">{{ selectedNodeInfo.nodeName }}</div>
          </div>

          <div v-if="selectedNodeInfo.loops.length > 0" class="loop-section">
            <h4 class="section-title">
              <i class="fas fa-circle-notch"></i> Feedback Loops
            </h4>
            <div class="loop-container">
              <div v-for="(loop, index) in selectedNodeInfo.loops" :key="'loop-' + index" 
                   class="loop-item" :class="loop.type.toLowerCase()">
                <div class="loop-badge">{{ loop.type }}</div>
                <div class="loop-variables">
                  <span v-for="(variable, idx) in loop.variables" :key="idx" class="variable-tag">
                    {{ variable }}<span v-if="idx < loop.variables.length - 1">, </span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="selectedNodeInfo.archetypes.length > 0" class="archetype-section">
            <h4 class="section-title">
              <i class="fas fa-shapes"></i> Archetypes
            </h4>
            <div class="archetype-container">
              <div v-for="archetype in selectedNodeInfo.archetypes" :key="'arch-' + archetype.id" 
                   class="archetype-item">
                <div class="archetype-icon">
                  <i class="fas" :class="getArchetypeIcon(archetype.type)"></i>
                </div>
                <div class="archetype-name">{{ formatArchetypeName(archetype.type) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import NavBar from '../components/NavBar.vue'
import { useCLDDetailViewModel } from '@/viewmodels/CLDDetailViewModel'
import { useCLDDiagramViewModel } from '@/viewmodels/CLDDiagramViewModel'

const route = useRoute()
const router = useRouter()
const networkContainer = ref(null)

// Initialize ViewModels
const { 
  diagram, 
  loading, 
  error, 
  fetchDiagram 
} = useCLDDetailViewModel()

const { 
  selectedNodeInfo, 
  createDiagram, 
  clearNodeSelection, 
  zoomIn, 
  zoomOut, 
  getArchetypeIcon, 
  formatArchetypeName 
} = useCLDDiagramViewModel()

// Format date for display
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString()
}

// Navigation handlers
const goBack = () => {
  router.go(-1)
}

const editDiagram = () => {
  router.push(`/cld/${route.params.id}/edit`)
}

onMounted(async () => {
  // Fetch the diagram data
  await fetchDiagram(route.params.id)
  
  // Once data is loaded, initialize the diagram
  await nextTick()
  if (diagram.value && networkContainer.value) {
    createDiagram(diagram.value, networkContainer.value)
  }
})
</script>

<style scoped>
.cld-detail-container {
  min-height: 100vh;
  background-color: #f5f7fa;
}

.cld-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.cld-details {
  background-color: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

h1 {
  color: #1a252f;
  margin-bottom: 1rem;
}

.description {
  color: #555;
  margin-bottom: 1.5rem;
}

.cld-meta {
  display: flex;
  gap: 1rem;
  color: #888;
  margin-bottom: 2rem;
}

.diagram-container {
  height: 600px;
  border: 1px solid #ddd;
  border-radius: 8px;
  margin-bottom: 2rem;
  overflow: hidden;
}

.network {
  width: 100%;
  height: 100%;
}

.cld-actions {
  display: flex;
  gap: 1rem;
}

button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-back {
  background-color: #6c757d;
  color: white;
}

.btn-back:hover {
  background-color: #5a6268;
}

.btn-edit {
  background-color: #42b983;
  color: white;
}

.btn-edit:hover {
  background-color: #3aa876;
}

.loading, .error {
  text-align: center;
  padding: 2rem;
  font-size: 1.1rem;
}

.error {
  color: #dc3545;
}

.zoom-controls {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  z-index: 10;
}

.zoom-button {
  background-color: #42b983;
  color: white;
  border: none;
  padding: 0.5rem;
  font-size: 1.5rem;
  border-radius: 50%;
  cursor: pointer;
  width: 3rem;
  height: 3rem;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  transition: background-color 0.3s;
}

.zoom-button:hover {
  background-color: #3aa876;
}

.diagram-container {
  position: relative;
  height: 600px;
  border: 1px solid #ddd;
  border-radius: 8px;
  margin-bottom: 2rem;
  overflow: hidden;
}

.archetype-popup {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.popup-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(3px);
}

.popup-card {
  position: relative;
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  animation: popupFadeIn 0.3s ease-out;
  z-index: 1001;
}

@keyframes popupFadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 1.5rem 1rem;
  border-bottom: 1px solid #eee;
}

.popup-header h3 {
  margin: 0;
  font-size: 1.3rem;
  color: #2c3e50;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.2rem;
  color: #7f8c8d;
  cursor: pointer;
  transition: color 0.2s;
  padding: 0.5rem;
}

.close-button:hover {
  color: #e74c3c;
}

.popup-body {
  padding: 1.5rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;
  color: #3498db;
  margin: 0 0 1rem 0;
}

.section-title i {
  color: #3498db;
}

.loop-container, .archetype-container {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  margin-bottom: 1.5rem;
}

.loop-item {
  padding: 0.8rem;
  border-radius: 8px;
  background: #f8f9fa;
  border-left: 4px solid #42b983;
}

.loop-item.reinforcing {
  border-left-color: #e74c3c;
}

.loop-item.balancing {
  border-left-color: #3498db;
}

.loop-badge {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.loop-item.reinforcing .loop-badge {
  background: #fde8e8;
  color: #e74c3c;
}

.loop-item.balancing .loop-badge {
  background: #e8f4fc;
  color: #3498db;
}

.loop-variables {
  font-size: 0.95rem;
  color: #34495e;
}

.variable-tag {
  background: #e8f4fc;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  margin-right: 0.3rem;
  display: inline-block;
}

.archetype-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.8rem;
  border-radius: 8px;
  background: #f8f9fa;
  transition: transform 0.2s;
}

.archetype-item:hover {
  transform: translateX(5px);
  background: #f1f8fe;
}

.archetype-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #e8f4fc;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3498db;
}

.archetype-name {
  font-weight: 500;
  color: #2c3e50;
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .popup-card {
    width: 95%;
  }
  
  .loop-item, .archetype-item {
    padding: 0.6rem;
  }
}

.node-name-section {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #eee;
}

.node-name {
  font-size: 1.1rem;
  font-weight: 500;
  color: #2c3e50;
  padding: 0.5rem;
  background: #f8f9fa;
  border-radius: 6px;
  margin-top: 0.5rem;
}

/* Adjust spacing for sections to account for new node name section */
.loop-section, .archetype-section {
  margin-top: 1.5rem;
}

</style>
