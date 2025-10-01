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
        
        <!-- Info Panel with Interaction Tips -->
        <div class="info-panel" v-if="showInfoPanel">
          <div class="info-icon"><i class="fas fa-info-circle"></i></div>
          <div class="info-content">
            <p><strong>How to interact with this diagram:</strong></p>
            <ul class="interaction-tips">
              <li><i class="fas fa-mouse-pointer"></i> Click on variables to see feedback loops and archetypes they participate in</li>
              <li><i class="fas fa-hand-paper"></i> Drag variables to reposition them for better visibility</li>
              <li><i class="fas fa-search-plus"></i> Use the zoom controls to adjust your view</li>
              <li><i class="fas fa-project-diagram"></i> Hover over relationships to highlight connections</li>
            </ul>
          </div>
          <button class="dismiss-info" @click="hideInfoPanel">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <!-- Diagram Container -->
        <div class="diagram-container">
          <div class="zoom-controls">
            <button @click="zoomIn" class="zoom-button" title="Zoom In">+</button>
            <button @click="zoomOut" class="zoom-button" title="Zoom Out">-</button>
          </div>
          <div ref="networkContainer" class="network"></div>
        </div>

        <div class="cld-actions">
          <button @click="goBack" class="btn-back">Back</button>
          <button @click="editDiagram" class="btn-edit">Edit</button>
        </div>
      </div>
    </div>

    <!-- Archetype / Loops Popup -->
    <div
      v-if="selectedNodeInfo.loops.length > 0 || selectedNodeInfo.archetypes.length > 0"
      class="archetype-popup"
    >
      <div class="popup-overlay" @click="clearNodeSelection"></div>

      <div class="popup-card">
        <div class="popup-header">
          <h3>Node Details</h3>
          <button @click="clearNodeSelection" class="close-button">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="popup-body">
          <!-- Node name (simple header) -->
          <div class="node-name-section">
            <h4 class="section-title">
              <i class="fas fa-circle"></i> Node Name
            </h4>
            <div class="node-name">{{ selectedNodeInfo.nodeName }}</div>
          </div>

          <!-- Feedback Loops -->
          <div v-if="selectedNodeInfo.loops.length > 0" class="loop-section">
            <h4 class="section-title">
              <i class="fas fa-circle-notch"></i> Feedback Loops
            </h4>

            <div class="loop-container">
              <div
                v-for="(loop, index) in selectedNodeInfo.loops"
                :key="'loop-' + index"
                class="loop-item"
              >
                <!-- light background from loop.color + dark text -->
                <div
                  class="loop-badge"
                  :style="{
                    backgroundColor: tint(loop.color, 0.18),
                    color: '#0F172A',
                    borderColor: tint(loop.color, 0.35)
                  }"
                >
                  {{ loop.type }}
                </div>

                <!-- chips (no commas) -->
                <div class="loop-variables">
                  <span
                    v-for="(variable, idx) in loop.variables"
                    :key="idx"
                    class="variable-tag"
                    :style="{
                      backgroundColor: tint(loop.color, 0.12),
                      color: '#0F172A',
                      borderColor: tint(loop.color, 0.28)
                    }"
                  >
                    {{ variable }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Archetypes -->
          <div v-if="selectedNodeInfo.archetypes.length > 0" class="archetype-section">
            <h4 class="section-title">
              <i class="fas fa-shapes"></i> Archetypes
            </h4>

            <div class="archetype-container">
              <div
                v-for="arch in selectedNodeInfo.archetypes"
                :key="'arch-' + arch.id"
                class="archetype-item"
                :style="{ borderLeftColor: arch.color }"
              >
                <!-- coluna fixa só para o dot (não encolhe) -->
                <div class="arch-col">
                  <span class="arch-dot" :style="{ backgroundColor: arch.color }"></span>
                </div>

                <!-- conteúdo flexível -->
                <div class="arch-content">
                  <div class="archetype-header">
                    <i class="fas" :class="getArchetypeIcon(arch.type)"></i>
                    <span class="archetype-name">{{ formatArchetypeName(arch.type) }}</span>
                  </div>

                  <div class="archetype-variables" v-if="arch.variables?.length">
                    <span
                      v-for="(v, i) in arch.variables"
                      :key="i"
                      class="variable-chip"
                      :style="{ borderColor: arch.color }"
                    >
                      {{ v }}
                    </span>
                  </div>
                </div>
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
const showInfoPanel = ref(true)

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

// Toggle info panel visibility
const hideInfoPanel = () => {
  showInfoPanel.value = false
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

// Make a translucent version of a HEX color for light backgrounds
const tint = (hex, alpha = 0.16) => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex; // fallback if not a HEX
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
</script>

<style scoped>
.cld-detail-container {
  min-height: 100vh;
  background-color: #f5f7fa;
}

.cld-content {
  max-width: 100%;
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

.info-panel {
  display: flex;
  align-items: flex-start;
  background-color: #e8f4fd;
  border-radius: 8px;
  padding: 1rem 1.5rem;
  margin-bottom: 1.5rem;
  border-left: 4px solid #3498db;
}

.info-icon {
  color: #3498db;
  font-size: 1.5rem;
  margin-right: 1rem;
  padding-top: 0.2rem;
}

.info-content {
  flex: 1;
}

.info-content p {
  margin-top: 0;
  margin-bottom: 0.5rem;
  color: #2c3e50;
}

.info-content ul {
  margin: 0;
  padding-left: 1.5rem;
}

.info-content li {
  margin-bottom: 0.3rem;
  color: #555;
}

.info-content ul.interaction-tips {
  margin: 0;
  padding-left: 0;
  list-style-type: none;
}

.info-content ul.interaction-tips li {
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
}

.info-content ul.interaction-tips li i {
  width: 24px;
  margin-right: 10px;
  color: #3498db;
}

.dismiss-info {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.3rem;
  margin-left: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dismiss-info:hover {
  color: #64748b;
}

.diagram-container {
  height: 70vh; /* Make the diagram taller to utilize screen space better */
  border: 1px solid #ddd;
  border-radius: 8px;
  margin-bottom: 2rem;
  overflow: hidden;
  position: relative;
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
  max-width: min(96vw, 980px);
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

/* Loops */
.loop-container { display: grid; gap: 12px; }
.loop-item { padding: 10px; border-left: 4px solid #D0D7DE; border-radius: 10px; background: #F7FBFF; }
.loop-badge { display: inline-block; color: #FFFFFF; padding: 4px 10px; border-radius: 8px; font-weight: 700; }
.variable-tag { display: inline-block; margin: 2px 6px 0 0; padding: 2px 8px; border: 2px solid #CBD5E1; border-radius: 999px; background: #FFFFFF; }

/* Archetypes */
.archetype-popup .popup-card {
  width: min(96vw, 980px);   /* wider popup but still responsive */
  max-height: 84vh;
}
.archetype-popup .popup-body {
  max-height: calc(84vh - 64px); /* scroll area below header */
  overflow: auto;
}

/* ===== Archetypes layout ===== */
.archetype-container {
  display: grid;
  gap: 14px;
}

/* two-column grid: fixed dot column + flexible content column */
.archetype-item {
  display: grid;
  grid-template-columns: 28px 1fr; /* 28px reserved for the dot */
  column-gap: 12px;
  align-items: start;

  border-left: 4px solid #D0D7DE; /* overridden inline with arch.color */
  background: #F7FBFF;
  border-radius: 12px;
  padding: 12px 14px;
}

/* fixed column: dot never shrinks */
.arch-col {
  grid-column: 1;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

/* the colored dot */
.arch-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  box-shadow: inset 0 0 0 3px #FFFFFF; /* WHITE ring for contrast */
  flex: 0 0 16px; /* prevent grow/shrink */
}

/* flexible content column */
.arch-content { grid-column: 2; }

.archetype-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.archetype-name { font-weight: 700; line-height: 1.25; }

/* variable chips (no commas) */
.archetype-variables {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.variable-chip {
  display: inline-block;
  font-size: 12px;
  padding: 2px 8px;
  border: 2px solid #CBD5E1; /* overridden inline with arch.color */
  border-radius: 999px;
  background: #FFFFFF;
}


</style>
