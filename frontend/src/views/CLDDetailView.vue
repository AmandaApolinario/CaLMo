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

    <!-- Archetype Popup - placed here so it overlays everything -->
    <!-- Popup for Loops and Archetypes -->
<div v-if="selectedNodeInfo.loops.length > 0 || selectedNodeInfo.archetypes.length > 0" class="archetype-popup">
  <div class="popup-content">
    <h3>Node Details</h3>

    <div v-if="selectedNodeInfo.loops.length > 0">
      <h4>Feedback Loops:</h4>
      <ul>
        <li v-for="(loop, index) in selectedNodeInfo.loops" :key="'loop-' + index">
          <strong>{{ loop.type }} Loop</strong><br/>
          Variables: {{ loop.variables.join(', ') }}
        </li>
      </ul>
    </div>

    <div v-if="selectedNodeInfo.archetypes.length > 0" style="margin-top: 1rem;">
      <h4>Archetypes:</h4>
      <ul>
        <li v-for="archetype in selectedNodeInfo.archetypes" :key="'arch-' + archetype.id">
          {{ archetype.type }}
        </li>
      </ul>
    </div>

    <button @click="selectedNodeInfo = { loops: [], archetypes: [] }" class="close-btn">Close</button>
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

  networkInstance.on("click", function(params) {
  if (params.nodes.length > 0) {
    const nodeId = params.nodes[0];
    showNodeDetails(nodeId);
  }
});
}

const selectedNodeArchetypes = ref([]);

const selectedNodeInfo = ref({
  loops: [],
  archetypes: []
});

const showNodeDetails = (nodeId) => {
  const loops = [];
  const archetypes = [];

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

  selectedNodeInfo.value = { loops, archetypes };
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

.archetype-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.popup-content {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.close-btn {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

</style> 