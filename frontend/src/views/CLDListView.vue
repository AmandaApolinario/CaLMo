<template>
  <div class="cld-list-container">
    <NavBar />
    <div class="cld-content">
      <div class="header">
        <h1>Causal Loop Diagrams</h1>
      </div>

      <div v-if="successMessage" class="global-success">
        <i class="fas fa-check-circle"></i> {{ successMessage }}
      </div>

      <div class="clds-actions">

        <div v-if="diagrams.length > 0" class="list-controls">
          <label class="select-all-container">
            <input
              type="checkbox"
              :checked="selectedDiagrams.length === diagrams.length && diagrams.length > 0"
              @change="toggleSelectAll"
            >
            Select All
            <span class="checkmark"></span>
          </label>
        </div>

        <transition name="fade">
            <div v-if="selectedDiagrams.length > 0" class="bulk-actions">
              <span class="selected-count">{{ selectedDiagrams.length }} selected</span>
              <div class="divider"></div>
              <span class="export-label">Export as:</span>
              <div class="export-group">
                <button @click="exportSelectedDiagrams('json')" title="Export as JSON" class="btn-export-sm">JSON</button>
                <button @click="exportSelectedDiagrams('csv')" title="Export as CSV" class="btn-export-sm">CSV</button>
                <button @click="exportSelectedDiagrams('xmile')" title="Export as XMILE" class="btn-export-sm">XMILE</button>
              </div>
              <div class="divider"></div>
              <button @click="confirmBulkDelete" class="btn-delete-bulk">
                <i class="fas fa-trash-alt"></i> Delete Selected
              </button>
            </div>
          </transition>

        <div class="general-actions">
          <div class="header-actions">
            <input
              type="file"
              ref="fileInput"
              @change="handleFileUpload"
              accept=".json,.xmile,.stmx"
              style="display: none;"
            />
            <button @click="triggerFileInput" class="btn-import" :disabled="isImporting">
              <i class="fas" :class="isImporting ? 'fa-spinner fa-spin' : 'fa-file-import'"></i>
              {{ isImporting ? 'Importing...' : 'Import CLD' }}
            </button>
          </div>
          <button @click="createNewCLD" class="btn-create">
            <i class="fas fa-plus"></i> Create New CLD
          </button>
        </div>
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
        <div v-for="diagram in diagrams" :key="diagram.id" class="cld-card" :class="{ 'is-selected': selectedDiagrams.includes(diagram.id) }">
          <div class="cld-card-content">
            <div class="card-header">
              <label class="card-checkbox-inline">
                  <input type="checkbox" :value="diagram.id" v-model="selectedDiagrams">
                  <span class="checkmark"></span>
              </label>
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
          <div class="card-export-bar">
            <span class="export-label">Export as:</span>
            <div class="export-buttons">
              <button @click.stop="exportDiagram(diagram.id, 'json')" title="JSON">JSON</button>
              <button @click.stop="exportDiagram(diagram.id, 'csv')" title="CSV">CSV</button>
              <button @click.stop="exportDiagram(diagram.id, 'xmile')" title="XMILE">XMILE</button>
            </div>
          </div>

          <div class="cld-actions">
            <button @click="viewDiagram(diagram.id)" class="btn-view">
              <i class="fas fa-eye"></i> View
            </button>
            <button @click="editDiagram(diagram.id)" class="btn-edit">
              <i class="fas fa-edit"></i> Edit
            </button>
            <button @click="canvasDiagram(diagram.id)" class="btn-view">
              <i class="fas fa-object-group"></i> Canvas
            </button>
            <button @click="confirmDeleteDiagram(diagram.id)" class="btn-delete">
              <i class="fas fa-trash-alt"></i> Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// Import necessary dependencies and components
import {onMounted, ref} from 'vue'
import { useRouter } from 'vue-router'
import NavBar from '../components/NavBar.vue'
import { useCLDListViewModel } from '@/viewmodels/CLDListViewModel'

// Initialize router
const router = useRouter()
const fileInput = ref(null);

// Initialize the ViewModel
const { 
  diagrams, 
  loading, 
  error, 
  fetchDiagrams, 
  deleteDiagram,
  isImporting,
  importCLDFromFile,
  successMessage,
  exportDiagram,
  selectedDiagrams,
  toggleSelectAll,
  deleteSelectedDiagrams,
  exportSelectedDiagrams,
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

const canvasDiagram = (id) => {
  router.push(`/cld/${id}/canvas`)
}

// Handles CLD deletion with user confirmation
const confirmDeleteDiagram = async (id) => {
  if (!confirm('Are you sure you want to delete this CLD?')) return
  await deleteDiagram(id)
}

const confirmBulkDelete = async () => {
  if (!confirm(`Are you sure you want to delete ${selectedDiagrams.value.length} diagrams? This action cannot be undone.`)) return
  await deleteSelectedDiagrams()
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString()
}


const triggerFileInput = () => {
  if (fileInput.value) fileInput.value.click();
};

const handleFileUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    await importCLDFromFile(file);
  } finally {
    event.target.value = '';
    if (isImporting !== undefined) isImporting.value = false;
  }
};

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
.fas, .far {
  font-size: 1rem;
}

.header-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.btn-import {
  background-color: #2c3e50;
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
  box-shadow: 0 2px 4px rgba(44, 62, 80, 0.3);
}

.btn-import:hover {
  background-color: #1a252f;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(44, 62, 80, 0.3);
}

.btn-import:disabled {
  background-color: #7f8c8d;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.global-success {
  margin-bottom: 2rem;
  padding: 1.2rem 1.5rem;
  background-color: #d4edda;
  color: #155724;
  border-radius: 8px;
  border-left: 4px solid #28a745;
  display: flex;
  align-items: center;
  gap: 0.8rem;
  font-weight: 500;
  font-size: 1.1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.cld-card {
  position: relative;
  transition: all 0.3s ease;
}
.cld-card.is-selected {
  border-color: #42b983;
  background-color: #f8fdfa;
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.3);
}

.header-title-wrapper {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  flex: 1;
}

.card-checkbox-inline, .select-all-container {
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
}
.card-checkbox-inline input, .select-all-container input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}
.checkmark {
  position: relative;
  display: inline-block;
  height: 22px;
  width: 22px;
  background-color: #fff;
  border: 2px solid #cbd5e0;
  border-radius: 6px;
  transition: all 0.2s;
  margin-right: 0.5rem;
  margin-left: 0.5rem;
}
.card-checkbox-inline:hover input ~ .checkmark, .select-all-container:hover input ~ .checkmark {
  background-color: #f1f5f9;
  border-color: #a0aec0;
}
.card-checkbox-inline input:checked ~ .checkmark, .select-all-container input:checked ~ .checkmark {
  background-color: #42b983;
  border-color: #42b983;
}
.checkmark:after {
  content: "";
  position: absolute;
  display: none;
  left: 6px; top: 2px;
  width: 5px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}
.card-checkbox-inline input:checked ~ .checkmark:after, .select-all-container input:checked ~ .checkmark:after {
  display: block;
}

.card-export-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.8rem 1.8rem;
  background-color: transparent;
  border-top: 1px dashed #e2e8f0;
  margin-top: auto;
}
.export-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.export-buttons {
  display: flex;
  gap: 0.4rem;
}
.export-buttons button {
  background-color: #f0fdf4;
  color: #166534;
  border: 1px solid #bbf7d0;
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s ease;
}
.export-buttons button:hover {
  background-color: #42b983;
  color: white;
  border-color: #42b983;
}
.list-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.8rem;
  background-color: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  margin-bottom: 2rem;
}
.select-all-container {
  font-weight: 600;
  color: #4a5568;
  font-size: 0.95rem;
}

.bulk-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  background-color: #ffffff;
  padding: 0.5rem 1.2rem;
  border-radius: 10px;
  border: 1px solid #42b983;
  box-shadow: 0 4px 12px rgba(66, 185, 131, 0.15);
  color: #1a252f;
  z-index: 10;
}
.selected-count {
  font-weight: 700;
  font-size: 0.9rem;
  color: #42b983;
}

.export-group {
  display: flex;
  gap: 0.4rem;
}
.btn-export-sm {
  background-color: #f0fdf4;
  color: #166534;
  border: 1px solid #bbf7d0;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}
.btn-export-sm:hover {
  background-color: #42b983;
  color: white;
  border-color: #42b983;
}

.divider {
  width: 1px;
  height: 24px;
  background-color: #e2e8f0;
}

.btn-delete-bulk {
  background-color: #fee2e2;
  color: #dc2626;
  border: 1px solid #fecaca;
  padding: 0.4rem 0.9rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
}
.btn-delete-bulk:hover {
  background-color: #dc2626;
  color: white;
  border-color: #dc2626; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-10px); }

.clds-actions {
  display: flex;
  align-items: flex-start;
  padding: 1rem 1.8rem;
  justify-content: space-between;
}

.general-actions {
  display: flex;
  gap: 2rem;
}
</style>