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
    console.log("Fetching CLD data...")
    const response = await axios.get(`/cld/${route.params.id}`)
    cld.value = response.data
    console.log("CLD data fetched:", cld.value)
    
    // Wait for the DOM to update before creating the diagram
    await nextTick()
    createDiagram()
  } catch (err) {
    error.value = 'Failed to fetch CLD details'
    console.error('Error fetching CLD:', err)
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
      solver: 'repulsion',
      repulsion: {
        nodeDistance: 300,
        centralGravity: 0.0,
        springLength: 300,
        springConstant: 0.2,
        damping: 0.09
      },
      stabilization: {
        iterations: 300,
        fit: true
      }
    },
    layout: {
      improvedLayout: true,
      randomSeed: 42
    },
    nodes: {
      shape: 'ellipse'
    },
    edges: {
      arrows: {
        to: {
          enabled: true,
          type: 'arrow',
          scaleFactor: 0.8
        }
      },
      smooth: {
        type: 'curvedCCW',
        roundness: 0.5
      },
      color: {
        opacity: 0.9
      },
      width: 3
    },
    interaction: {
      hover: true,
      tooltipDelay: 200,
      dragNodes: true,
      zoomView: true,
      dragView: true
    }
  }

  networkInstance = new Network(container, data, options)
}

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
  position: relative; /* IMPORTANT to make zoom buttons float inside */
  height: 600px;
  border: 1px solid #ddd;
  border-radius: 8px;
  margin-bottom: 2rem;
  overflow: hidden;
}

</style> 