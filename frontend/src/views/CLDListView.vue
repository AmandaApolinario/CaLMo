<template>
  <div class="cld-list-container">
    <NavBar />
    <div class="cld-content">
      <div class="header">
        <h1>Causal Loop Diagrams</h1>
        <button @click="createNewCLD" class="btn-create">
          <i class="fas fa-plus"></i> Create New CLD
        </button>
        <button @click="showImportModal = true" class="btn-create">
          <i class="fas fa-plus"></i> Import CLD
        </button>
        <button
          type="button"
          class="btn-create"
          @click="exporting ? confirmExport() : toggleExporting()"
        >
          <i class="fas" :class="exporting ? 'fa-check' : 'fa-file-export'"></i>
          {{ exporting ? 'Confirm Export' : 'Export CLDs' }}
        </button>
        <button
          v-if="exporting"
          type="button"
          class="btn-create"
          style="background:#e2e8f0;color:#1a252f;"
          @click="selectAll"
        >
          {{ selectedDiagrams.length === diagrams.length ? 'Unselect All' : 'Select All' }}
        </button>
      </div>

      <div v-if="loading" class="loading">
        <i class="fas fa-spinner fa-spin"></i> Loading CLDs...
      </div>
      <div v-else-if="error" class="error">
        <i class="fas fa-exclamation-circle"></i> {{ error }}
      </div>
      <div v-else-if="diagrams.length === 0" class="empty">
        <i class="fas fa-diagram-project"></i>
        <p>No CLDs found. Create your first CLD!</p>
      </div>
      <div v-else class="cld-grid">
        <div v-for="diagram in diagrams" :key="diagram.id" class="cld-card" :style="exporting ? 'position:relative;' : ''">
          <div v-if="exporting" style="position:absolute;top:10px;left:10px;z-index:2;">
            <input
              type="checkbox"
              :value="diagram.id"
              v-model="selectedDiagrams"
            />
          </div>
          <div class="cld-card-content">
            <div class="card-header">
              <h3>{{ diagram.title }}</h3>
              <div class="badge">{{ diagram.variable_count || 0 }} variables</div>
            </div>
            <p class="description">{{ diagram.description }}</p>
            <div class="cld-meta">
              <span class="date"><i class="far fa-calendar"></i> {{ formatDate(diagram.createdAt) }}</span>
              <span class="last-modified" v-if="diagram.updatedAt">
                <i class="far fa-clock"></i> Modified: {{ formatDate(diagram.updatedAt) }}
              </span>
            </div>
          </div>
          <div class="cld-actions">
            <button @click="viewDiagram(diagram.id)" class="btn-view">
              <i class="fas fa-eye"></i> View
            </button>
            <button @click="editDiagram(diagram.id)" class="btn-edit">
              <i class="fas fa-edit"></i> Edit
            </button>
            <button @click="confirmDeleteDiagram(diagram.id)" class="btn-delete">
              <i class="fas fa-trash-alt"></i> Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  <ImportFileModal v-if="showImportModal" @close="showImportModal = false" :import-object-name="'CLD'"
    :accepted-extensions="['.csv', '.json']" :objectVariables="objectVariables" :import-function="importDiagrams" />
  <Alert v-if="messages.show" :type="messages.type" :message="messages.text"
    @close="messages.show = false" />
</template>

<script setup>
// Import necessary dependencies and components
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import NavBar from '../components/NavBar.vue'
import Alert from '../components/Alert.vue'
import ImportFileModal from '../components/ImportFileModal.vue'
import { useCLDListViewModel } from '@/viewmodels/CLDListViewModel'

// Initialize router
const router = useRouter()
const objectVariables = [
  {
    name: ["name"],
    description: ["description"],
    date: ["date"],
    relationships: [
      {
        source: {
          name: ["name"],
          description: ["description"]
        },
        target: {
          name: ["name"],
          description: ["description"]
        },
        polarity: ["polarity"]
      }
    ]
  }
]

// Initialize the ViewModel
const {
  diagrams,
  loading,
  error,
  fetchDiagrams,
  deleteDiagram,
  showImportModal,
  messages,
  importDiagrams,
  exporting,
  selectedDiagrams,
  toggleExporting,
  selectAll,
  confirmExport,
} = useCLDListViewModel();

// Navigation handlers for CLD operations
const createNewCLD = () => {
  router.push('/cld/new')
}

const viewDiagram = (id) => {
  router.push(`/cld/${id}`)
}

const editDiagram = (id) => {
  router.push(`/cld/${id}/edit`)
}

// Handles CLD deletion with user confirmation
const confirmDeleteDiagram = async (id) => {
  if (!confirm('Are you sure you want to delete this CLD?')) return
  await deleteDiagram(id)
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString()
}

onMounted(() => {
  fetchDiagrams()
})

</script>

<style scoped>
.cld-list-container {
  min-height: 100vh;
  background-color: #f5f7fa;
  width: 100%;
}

.cld-content {
  max-width: 2000px;
  margin: 0 auto;
  padding: 2rem 3rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

h1 {
  color: #1a252f;
  font-size: 2.5rem;
  margin: 0;
  font-weight: 600;
}

.btn-create {
  background-color: #42b983;
  color: white;
  padding: 0.9rem 1.8rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.05rem;
  box-shadow: 0 2px 4px rgba(66, 185, 131, 0.3);
}

.btn-create:hover {
  background-color: #3aa876;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(66, 185, 131, 0.3);
}

.cld-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
  gap: 2rem;
}

.cld-card {
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid #e2e8f0;
}

.cld-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
  border-color: #cbd5e0;
}

.cld-card-content {
  padding: 1.8rem;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.2rem;
}

.card-header h3 {
  color: #1a252f;
  margin: 0;
  font-size: 1.4rem;
  font-weight: 600;
  flex: 1;
}

.badge {
  background-color: #e2f3eb;
  color: #42b983;
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  margin-left: 1rem;
}

.description {
  color: #555;
  margin-bottom: 1.5rem;
  line-height: 1.6;
  flex: 1;
}

.cld-meta {
  display: flex;
  justify-content: space-between;
  color: #718096;
  font-size: 0.9rem;
  margin-top: auto;
}

.cld-meta i {
  margin-right: 0.4rem;
  opacity: 0.8;
}

.cld-actions {
  display: flex;
  border-top: 1px solid #edf2f7;
  padding: 1rem;
  gap: 0.8rem;
}

.cld-actions button {
  flex: 1;
  padding: 0.7rem;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.95rem;
}

.btn-view {
  background-color: #2c3e50;
  color: white;
}

.btn-view:hover {
  background-color: #1a252f;
}

.btn-edit {
  background-color: #42b983;
  color: white;
}

.btn-edit:hover {
  background-color: #3aa876;
}

.btn-delete {
  background-color: #fef2f2;
  color: #dc3545;
}

.btn-delete:hover {
  background-color: #fee2e2;
}

.loading,
.error,
.empty {
  text-align: center;
  padding: 3rem 2rem;
  font-size: 1.2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.loading i,
.error i,
.empty i {
  font-size: 2.5rem;
  color: #42b983;
  opacity: 0.8;
}

.loading i {
  color: #718096;
}

.error i {
  color: #dc3545;
}

.empty i {
  color: #a0aec0;
}

.empty p {
  color: #718096;
  margin: 0;
}

.error {
  color: #dc3545;
}

/* Font Awesome icons */
.fas,
.far {
  font-size: 1rem;
}
</style>