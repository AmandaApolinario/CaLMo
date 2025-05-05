<template>
  <div class="cld-detail-container">
    <NavBar />
    <div class="cld-content">
      <div v-if="loading" class="loading">Loading CLD...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else class="cld-details">
        <h1>{{ cld.name }}</h1>
        <p class="description">{{ cld.description }}</p>
        <div class="cld-meta">
          <span class="date">Created: {{ formatDate(cld.date) }}</span>
          <span class="variables-count">{{ cld.variables.length }} variables</span>
        </div>
        
        <!-- Diagram Container -->
        <div class="diagram-container">
          <div class="zoom-controls">
            <button @click="zoomIn" class="zoom-button">+</button>
            <button @click="zoomOut" class="zoom-button">-</button>
          </div>
          <div ref="network" class="network"></div>
        </div>

        <div class="cld-actions">
          <button @click="goBack" class="btn-back">Back</button>
          <button @click="editCLD" class="btn-edit">Edit</button>
        </div>
      </div>
    </div>

        <!-- Improved Archetype Popup -->
        <div v-if="selectedNodeInfo.loops.length > 0 || selectedNodeInfo.archetypes.length > 0" class="archetype-popup">
    <div class="popup-overlay" @click="closePopup"></div>
    <div class="popup-card">
      <div class="popup-header">
        <h3>Node Details</h3>
        <button @click="closePopup" class="close-button">
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
import axios from 'axios'
import NavBar from '../components/NavBar.vue'
import { Network } from 'vis-network'
import { DataSet } from 'vis-data'
import 'vis-network/styles/vis-network.css'
import { watch } from 'vue'


const route = useRoute()
const router = useRouter()
const cld = ref({})
const loading = ref(true)
const error = ref('')
const network = ref(null)

const fetchCLD = async () => {
  try {
    console.log("Starting CLD data fetch process...")
    
    // First POST request to generate feedback loops
    console.log("Generating feedback loops...")
    await axios.post(`/cld/${route.params.id}/feedback-loops`)
    
    // Second POST request to generate archetypes (runs after first completes)
    console.log("Generating archetypes...")
    await axios.post(`/cld/${route.params.id}/archetypes`)
    
    // Now fetch the CLD data
    console.log("Fetching CLD data...")
    const response = await axios.get(`/cld/${route.params.id}`)
    cld.value = response.data
    console.log("CLD data fetched:", cld.value)
    
    // Wait for the DOM to update before creating the diagram
    await nextTick()
    createDiagram()
  } catch (err) {
    error.value = 'Failed to process CLD details'
    console.error('Error processing CLD:', err)
  } finally {
    loading.value = false
  }
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString()
}

const goBack = () => {
  router.go(-1)
}

const editCLD = () => {
  router.push(`/cld/${route.params.id}/edit`)
}

const createDiagram = () => {
  console.log("Creating improved diagram...")

  if (!network.value) {
    console.error("Network container not found")
    return
  }

  console.log(JSON.stringify(cld, removeCircularReferences(), 2))

  if (!cld.value.variables || !cld.value.relationships) {
    console.error("Missing data for diagram:", cld.value)
    return
  }

  // Get all variable IDs that are part of archetypes
  const archetypeVariableIds = new Set();
  if (cld.value.archetypes && cld.value.archetypes.length > 0) {
    cld.value.archetypes.forEach(archetype => {
      archetype.variables.forEach(variableId => {
        archetypeVariableIds.add(variableId);
      });
    });
  }

  const nodes = new DataSet(
    cld.value.variables.map(variable => {
      // Default node properties
      const node = {
        id: variable.id,
        label: variable.name,
        shape: 'ellipse',
        font: { size: 18, color: '#000000', face: 'Arial' },
        borderWidth: 2
      };

      // Check if variable is part of an archetype
      if (archetypeVariableIds.has(variable.id)) {
        // Archetype variables get special coloring
        node.color = {
          background: '#BED7ED', 
          border: '#BED7ED',
          highlight: { background: '#79A5CB', border: '#79A5CB' }
        };
      } else {
        // Regular variables
        node.color = {
          background: '#FFF0CE',
          border: '#FFF0CE',
          highlight: { background: '#C3A869', border: '#C3A869' }
        };
      }

      return node;
    })
  );

  // Rest of your createDiagram function remains the same...
  const edges = new DataSet(
    cld.value.relationships.map(relationship => ({
      from: relationship.source_id,
      to: relationship.target_id,
      arrows: 'to',
      label: relationship.type === 'Positive' ? '+' : '-',
      font: { size: 18, align: 'middle' },
      color: {
        color: relationship.type === 'Positive' ? '#28a745' : '#dc3545',
        highlight: relationship.type === 'Positive' ? '#28a745' : '#dc3545',
        opacity: 0.9
      },
      width: 3,
      smooth: {
        type: 'curvedCCW',
        roundness: 0.5
      }
    }))
  );

  const container = network.value
  const data = { nodes, edges }

  const options = {
    physics: {
      enabled: true,
      solver: 'forceAtlas2Based', // Better for preventing overlaps
      forceAtlas2Based: {
        gravitationalConstant: -50,
        centralGravity: 0.01,
        springLength: 200,
        springConstant: 0.08,
        damping: 0.4,
        avoidOverlap: 1 // This is key to prevent node overlaps
      },
      stabilization: {
        enabled: true,
        iterations: 1000, // Increased iterations for better layout
        updateInterval: 25,
        onlyDynamicEdges: false,
        fit: true
      },
      timestep: 0.5,
      adaptiveTimestep: true
    },
    layout: {
      improvedLayout: true,
      hierarchical: {
        enabled: false,
        nodeSpacing: 150,
        treeSpacing: 200,
        direction: 'UD',
        sortMethod: 'directed'
      }
    },
    nodes: {
      shape: 'ellipse',
      margin: 10, // Add margin around node labels
      size: 30, // Standardize node size
      font: {
        size: 14,
        face: 'Arial',
        strokeWidth: 3,
        strokeColor: '#ffffff'
      },
      borderWidth: 2,
      shadow: {
        enabled: true,
        color: 'rgba(0,0,0,0.2)',
        size: 10,
        x: 5,
        y: 5
      }
    },
    edges: {
      smooth: {
        type: 'continuous', // Smoother curves
        roundness: 0.5
      },
      arrows: {
        to: {
          enabled: true,
          type: 'arrow',
          scaleFactor: 0.8
        }
      },
      color: {
        opacity: 0.9
      },
      width: 2,
      selectionWidth: 3,
      font: {
        size: 14,
        align: 'middle',
        strokeWidth: 3,
        strokeColor: '#ffffff'
      }
    },
    interaction: {
      hover: true,
      tooltipDelay: 200,
      dragNodes: true,
      zoomView: true,
      dragView: true,
      hideEdgesOnDrag: false,
      hideNodesOnDrag: false,
      multiselect: false,
      navigationButtons: false,
      keyboard: false
    }
  }

  // Add repulsion to prevent overlap
  options.physics.repulsion = {
    nodeDistance: 300, // Increased distance between nodes
    centralGravity: 0.2,
    springLength: 200,
    springConstant: 0.05,
    damping: 0.09
  }

  // Configure the barnesHut physics model for better node distribution
  options.physics.barnesHut = {
    gravitationalConstant: -2000,
    centralGravity: 0.3,
    springLength: 200,
    springConstant: 0.04,
    damping: 0.09,
    avoidOverlap: 0.5
  }

  networkInstance = new Network(container, data, options)

  // After stabilization, run another layout pass to ensure no overlaps
  networkInstance.once('stabilizationIterationsDone', function() {
    networkInstance.setOptions({
      physics: {
        enabled: false // Turn off physics after stabilization
      }
    })
  })

  networkInstance.on("click", function(params) {
    if (params.nodes.length > 0) {
      const nodeId = params.nodes[0]
      showNodeDetails(nodeId)
    }
  })
}

const selectedNodeArchetypes = ref([]);

const selectedNodeInfo = ref({
  loops: [],
  archetypes: []
});

const showNodeDetails = (nodeId) => {
  const loops = [];
  const archetypes = [];
  let nodeName = '';

  // Get the node name first
  const node = cld.value.variables.find(v => v.id === nodeId);
  if (node) {
    nodeName = node.name;
  }

  // Check feedback loops
  if (cld.value.feedback_loops) {
    cld.value.feedback_loops.forEach(loop => {
      if (loop.variables.includes(nodeId)) {
        const variableNames = loop.variables.map(varId => {
          const variable = cld.value.variables.find(v => v.id === varId);
          return variable ? variable.name : '';
        }).filter(name => name !== '');

        loops.push({
          type: loop.type,
          variables: variableNames
        });
      }
    });
  }

  // Check archetypes
  if (cld.value.archetypes) {
    cld.value.archetypes.forEach(archetype => {
      if (archetype.variables.includes(nodeId)) {
        archetypes.push({
          id: archetype.id,
          type: archetype.type
        });
      }
    });
  }

  selectedNodeInfo.value = { 
    nodeName,  // Add node name to the info
    loops, 
    archetypes 
  };
};

function removeCircularReferences() {
  const seen = new WeakSet()
  return (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return undefined // remove circular reference
      }
      seen.add(value)
    }
    return value
  }
}

let networkInstance = null  // Add this near your refs

const zoomIn = () => {
  if (networkInstance) {
    const scale = networkInstance.getScale()
    networkInstance.moveTo({
      scale: scale * 1.2,   // Zoom in by 20%
      animation: true
    })
  }
}

const zoomOut = () => {
  if (networkInstance) {
    const scale = networkInstance.getScale()
    networkInstance.moveTo({
      scale: scale / 1.2,   // Zoom out by 20%
      animation: true
    })
  }
}



onMounted(() => {
  console.log("Component mounted, fetching CLD...")
  fetchCLD()
})

watch(loading, (newVal) => {
  if (!newVal) {
    nextTick(() => {
      createDiagram()
    })
  }
})

const closePopup = () => {
  selectedNodeInfo.value = { loops: [], archetypes: [] }
}

const formatArchetypeName = (name) => {
  return name.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ')
}

const getArchetypeIcon = (type) => {
  const icons = {
    'FIXES_THAT_FAIL': 'fa-tools',
    'SHIFTING_THE_BURDEN': 'fa-balance-scale',
    'LIMITS_TO_GROWTH': 'fa-chart-line',
    'GROWTH_AND_UNDERINVESTMENT': 'fa-seedling',
    'SUCCESS_TO_THE_SUCCESSFUL': 'fa-trophy',
    'TRAAGEDY_OF_THE_COMMONS': 'fa-users',
    'ESCALATION': 'fa-arrow-up'
  }
  return icons[type] || 'fa-puzzle-piece'
}
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
