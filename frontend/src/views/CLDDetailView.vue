<template>
  <div class="cld-detail-container">
    <div v-if="loading" class="loading">Loading CLD...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="!cld" class="empty">CLD not found</div>
    <div v-else class="cld-detail">
      <div class="cld-header">
        <h2>{{ cld.name }}</h2>
        <div class="cld-meta">
          <p class="date">Created: {{ formatDate(cld.date) }}</p>
          <div class="header-actions">
            <button @click="editCLD" class="btn-edit">Edit</button>
            <button @click="deleteCLD" class="btn-delete">Delete</button>
          </div>
        </div>
      </div>

      <div class="cld-description">
        <h3>Description</h3>
        <p>{{ cld.description }}</p>
      </div>

      <div class="cld-variables">
        <h3>Variables</h3>
        <div v-if="cld.variables.length === 0" class="empty">No variables added yet</div>
        <div v-else class="variables-grid">
          <div v-for="variable in cld.variables" :key="variable.id" class="variable-card">
            <h4>{{ variable.name }}</h4>
            <p>{{ variable.description }}</p>
          </div>
        </div>
      </div>

      <div class="cld-relationships">
        <h3>Relationships</h3>
        <div v-if="cld.relationships.length === 0" class="empty">No relationships defined yet</div>
        <div v-else class="relationships-list">
          <div v-for="rel in cld.relationships" :key="rel.id" class="relationship-item">
            <span class="source">{{ getVariableName(rel.source_id) }}</span>
            <span class="arrow" :class="rel.type.toLowerCase()">→</span>
            <span class="target">{{ getVariableName(rel.target_id) }}</span>
            <span class="type">({{ rel.type }})</span>
          </div>
        </div>
      </div>

      <div class="cld-analysis">
        <h3>Analysis</h3>
        <div class="analysis-section">
          <h4>Feedback Loops</h4>
          <button @click="identifyFeedbackLoops" class="btn-analyze">Identify Feedback Loops</button>
          <div v-if="feedbackLoops.length > 0" class="loops-list">
            <div v-for="(loop, index) in feedbackLoops" :key="index" class="loop-item">
              <h5>Loop {{ index + 1 }}</h5>
              <div class="loop-variables">
                <span v-for="(varId, idx) in loop.variables" :key="idx">
                  {{ getVariableName(varId) }}
                  <span v-if="idx < loop.variables.length - 1">→</span>
                </span>
              </div>
              <p class="loop-type">Type: {{ loop.type }}</p>
            </div>
          </div>
        </div>

        <div class="analysis-section">
          <h4>Archetypes</h4>
          <button @click="identifyArchetypes" class="btn-analyze">Identify Archetypes</button>
          <div v-if="archetypes.length > 0" class="archetypes-list">
            <div v-for="(archetype, index) in archetypes" :key="index" class="archetype-item">
              <h5>{{ archetype.type }}</h5>
              <p>{{ archetype.description }}</p>
              <div class="archetype-variables">
                <span v-for="varId in archetype.variables" :key="varId" class="variable-tag">
                  {{ getVariableName(varId) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const router = useRouter()
const cld = ref(null)
const loading = ref(false)
const error = ref('')
const feedbackLoops = ref([])
const archetypes = ref([])

const fetchCLD = async () => {
  loading.value = true
  error.value = ''
  try {
    const response = await axios.get(`/cld/${route.params.id}`)
    cld.value = response.data
  } catch (err) {
    error.value = 'Failed to fetch CLD'
    console.error('Error fetching CLD:', err)
  } finally {
    loading.value = false
  }
}

const deleteCLD = async () => {
  if (!confirm('Are you sure you want to delete this CLD?')) return
  
  loading.value = true
  error.value = ''
  try {
    await axios.delete(`/cld/${route.params.id}`)
    router.push('/clds')
  } catch (err) {
    error.value = 'Failed to delete CLD'
    console.error('Error deleting CLD:', err)
  } finally {
    loading.value = false
  }
}

const editCLD = () => {
  // TODO: Implement edit functionality
  console.log('Edit CLD:', cld.value)
}

const identifyFeedbackLoops = async () => {
  loading.value = true
  error.value = ''
  try {
    const response = await axios.post(`/cld/${route.params.id}/feedback-loops`)
    feedbackLoops.value = response.data
  } catch (err) {
    error.value = 'Failed to identify feedback loops'
    console.error('Error identifying feedback loops:', err)
  } finally {
    loading.value = false
  }
}

const identifyArchetypes = async () => {
  loading.value = true
  error.value = ''
  try {
    const response = await axios.post(`/cld/${route.params.id}/archetypes`)
    archetypes.value = response.data
  } catch (err) {
    error.value = 'Failed to identify archetypes'
    console.error('Error identifying archetypes:', err)
  } finally {
    loading.value = false
  }
}

const getVariableName = (id) => {
  const variable = cld.value?.variables.find(v => v.id === id)
  return variable ? variable.name : `Variable ${id}`
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString()
}

onMounted(() => {
  fetchCLD()
})
</script>

<style scoped>
.cld-detail-container {
  max-width: 1600px;
  margin: 0 auto;
  padding: 2rem;
}

.cld-header {
  margin-bottom: 3rem;
  padding-bottom: 1.5rem;
  border-bottom: 2px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.cld-header h2 {
  margin: 0;
  font-size: 2.5rem;
  color: #1a252f;
}

.cld-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1rem;
}

.date {
  color: #666;
  font-size: 1rem;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.cld-description {
  margin-bottom: 3rem;
  max-width: 1000px;
  font-size: 1.1rem;
  line-height: 1.6;
}

.cld-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  margin-bottom: 3rem;
}

.cld-variables {
  grid-column: 1;
}

.cld-relationships {
  grid-column: 2;
}

.cld-analysis {
  grid-column: 1 / -1;
}

.variables-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
  margin-top: 1.5rem;
}

.variable-card {
  padding: 2rem;
  background-color: #f8f9fa;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  transition: all 0.3s ease;
}

.variable-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 12px rgba(0,0,0,0.15);
}

.variable-card h4 {
  font-size: 1.3rem;
  margin-bottom: 1rem;
  color: #1a252f;
}

.variable-card p {
  font-size: 1.1rem;
  line-height: 1.5;
  color: #444;
}

.relationships-list {
  margin-top: 1.5rem;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}

.relationship-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background-color: #f8f9fa;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.arrow {
  font-weight: bold;
  font-size: 1.5rem;
}

.arrow.positive {
  color: #42b983;
}

.arrow.negative {
  color: #dc3545;
}

.type {
  color: #666;
  font-size: 1rem;
  margin-left: 0.5rem;
}

.analysis-section {
  margin-bottom: 3rem;
  padding: 2.5rem;
  background-color: #f8f9fa;
  border-radius: 16px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.analysis-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
  margin-top: 2rem;
}

.btn-analyze {
  margin: 1rem 0;
  padding: 1rem 2rem;
  background-color: #2c3e50;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.1rem;
  transition: all 0.3s ease;
}

.btn-analyze:hover {
  background-color: #1a252f;
  transform: translateY(-2px);
}

.loops-list, .archetypes-list {
  margin-top: 2rem;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
}

.loop-item, .archetype-item {
  padding: 2rem;
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.loop-variables {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 1.5rem 0;
  font-size: 1.2rem;
}

.loop-type {
  color: #666;
  font-size: 1rem;
  margin-top: 1rem;
}

.archetype-variables {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.variable-tag {
  padding: 0.75rem 1.25rem;
  background-color: #e9ecef;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.variable-tag:hover {
  background-color: #dee2e6;
  transform: translateY(-2px);
}

button {
  padding: 1rem 2rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  font-size: 1.1rem;
  transition: all 0.3s ease;
}

.btn-edit {
  background-color: #42b983;
  color: white;
}

.btn-edit:hover {
  background-color: #3aa876;
  transform: translateY(-2px);
}

.btn-delete {
  background-color: #dc3545;
  color: white;
}

.btn-delete:hover {
  background-color: #c82333;
  transform: translateY(-2px);
}

.loading, .error, .empty {
  text-align: center;
  padding: 4rem;
  color: #666;
  font-size: 1.3rem;
}

.error {
  color: #dc3545;
}

h3 {
  font-size: 1.8rem;
  margin-bottom: 2rem;
  color: #1a252f;
  border-bottom: 2px solid #eee;
  padding-bottom: 1rem;
}

h4 {
  font-size: 1.4rem;
  margin-bottom: 1.5rem;
  color: #1a252f;
}

h5 {
  font-size: 1.2rem;
  margin-bottom: 1rem;
  color: #1a252f;
}

@media (max-width: 1200px) {
  .cld-content {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
  
  .cld-variables, .cld-relationships {
    grid-column: auto;
  }
}
</style> 