<template>
  <div class="variables-container">
    <NavBar />
    <div class="variables-content">
      <div class="header">
        <h1>Variables Management</h1>
      </div>

      <div class="layout">
        <!-- Create/Edit Variable Form -->
        <div class="form-panel">
          <div class="panel-header">
            <h3>{{ isEditing ? 'Edit Variable' : 'Create New Variable' }}</h3>
          </div>
          <form @submit.prevent="submitForm" class="variable-form">
            <div class="form-group">
              <label for="name">Name</label>
              <input type="text" id="name" v-model="newVariable.name" required placeholder="Enter variable name"
                class="form-input" />
            </div>
            <div class="form-group">
              <label for="description">Description</label>
              <textarea id="description" v-model="newVariable.description" placeholder="Enter variable description"
                class="form-textarea" rows="6"></textarea>
            </div>
            <div class="form-actions">
              <button type="button" v-if="isEditing" @click="cancelEditing" class="btn-cancel">
                <i class="fas fa-times"></i> Cancel
              </button>
              <button type="submit" :disabled="loading" class="btn-submit">
                <i class="fas" :class="loading ? 'fa-spinner fa-spin' : (isEditing ? 'fa-save' : 'fa-plus')"></i>
                {{ loading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update' : 'Create') }}
              </button>
            </div>
          </form>
        </div>

        <!-- Variables List -->
        <div class="list-panel">
          <div class="panel-header">
            <h3>Your Variables</h3>
            <div class="panel-action">
              <div class="total-count">{{ variables.length }} variables</div>
              <button type="button" class="btn-submit" @click="showImportModal = true">Import Variables</button>
              <button type="button" class="btn-submit" @click="exporting ? confirmExport() : toggleExporting()">
                <i class="fas" :class="exporting ? 'fa-check' : 'fa-file-export'"></i>
                {{ exporting ? 'Confirm Export' : 'Export Variables' }}
              </button>
              <button type="button" class="btn-cancel" v-if="exporting" @click="toggleExporting">
                <i class="fas" :class="exporting ? 'fa-check' : 'fa-file-export'"></i>
                Cancel Export
              </button>
              <button v-if="exporting" type="button" class="btn-cancel" @click="selectAll">
                {{ selectedVariables.length === variables.length ? 'Unselect All' : 'Select All' }}
              </button>
            </div>
          </div>

          <div v-if="loading" class="loading">
            <i class="fas fa-spinner fa-spin"></i> Loading variables...
          </div>
          <div v-else-if="error" class="error">
            <i class="fas fa-exclamation-circle"></i> {{ error }}
          </div>
          <div v-else-if="variables.length === 0" class="empty">
            <i class="fas fa-box-open"></i>
            <p>No variables created yet</p>
          </div>
          <div v-else class="variable-grid">
            <div v-for="variable in variables" :key="variable.id" class="variable-card"
              :style="exporting ? 'position:relative;' : ''">
              <div v-if="exporting" style="position:absolute;top:10px;left:10px;z-index:2;">
                <input type="checkbox" :value="variable.id" v-model="selectedVariables" />
              </div>
              <div class="card-content">
                <h4>{{ variable.name }}</h4>
                <p class="description">{{ variable.description || 'No description provided' }}</p>
              </div>
              <div class="variable-actions">
                <button @click="editVariableHandler(variable)" class="btn-edit">
                  <i class="fas fa-edit"></i> Edit
                </button>
                <button @click="deleteVariableHandler(variable.id)" class="btn-delete">
                  <i class="fas fa-trash-alt"></i> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <ImportVariablesModal v-if="showImportModal" @close="showImportModal = false" :import-object-name="'Variables'"
    :accepted-extensions="['.json']" :objectVariables="{ name: ['name'], description: ['description'] }"
    :import-function="importVariables" />

  <Alert :show="importMessages.show" :type="importMessages.type" :text="importMessages.text" />
</template>

<script setup>
import { onMounted, ref } from 'vue'
import NavBar from '../components/NavBar.vue'
import ImportVariablesModal from '../components/ImportFileModal.vue'
import Alert from '../components/Alert.vue'
import { useVariablesViewModel } from '@/viewmodels/VariablesViewModel'

// Initialize ViewModel
const {
  variables,
  loading,
  error,
  message,
  isEditing,
  newVariable,
  showImportModal,
  uploadedFiles,
  fetchVariables,
  submitForm,
  deleteVariable,
  startEditing,
  cancelEditing,
  exportVariable,
  importVariables,
  messages,
  notificationTimeout,
  exporting,
  selectedVariables,
  toggleExporting,
  selectAll,
  confirmExport,
} = useVariablesViewModel()



// Handler functions
const editVariableHandler = (variable) => {
  startEditing(variable)

  // Scroll to form
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

const deleteVariableHandler = async (id) => {
  if (!confirm('Are you sure you want to delete this variable?')) return
  await deleteVariable(id)
}

onMounted(() => {
  fetchVariables()
})
</script>

<style scoped>
.variables-container {
  min-height: 100vh;
  background-color: #f5f7fa;
  margin: 0;
  padding: 0;
}

.variables-content {
  max-width: 100%;
  margin: 0;
  padding: 0;
}

.header {
  margin: 0;
  padding: 2rem 3rem 1.5rem 3rem;
  border-bottom: 1px solid #e2e8f0;
}

.layout {
  display: flex;
  gap: 2.5rem;
  margin: 0;
  padding: 0 3rem 3rem 3rem;
}

.form-panel,
.list-panel {
  margin: 0;
}

.list-panel {
  flex: 2;
  min-width: 800px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 1.8rem;
  border-bottom: 1px solid #e2e8f0;
}

.panel-action {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.panel-header h3 {
  margin: 0;
  font-size: 1.4rem;
  color: #1a252f;
}

.total-count {
  background-color: #e2f3eb;
  color: #42b983;
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
}

.variable-form {
  padding: 1.8rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-input,
.form-textarea {
  padding: 0.9rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s ease;
  width: 100%;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #42b983;
  box-shadow: 0 0 0 3px rgba(66, 185, 131, 0.2);
}

.form-textarea {
  resize: vertical;
  min-height: 150px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
}

.btn-submit {
  background-color: #42b983;
  color: white;
  padding: 0.8rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-submit:hover {
  background-color: #3aa876;
  transform: translateY(-2px);
}

.btn-submit:disabled {
  background-color: #a0aec0;
  transform: none;
  cursor: not-allowed;
}

.btn-cancel {
  background-color: #e2e8f0;
  color: #1a252f;
  padding: 0.8rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-cancel:hover {
  background-color: #cbd5e0;
}

.variable-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 1.8rem;
  margin-top: 1.5rem;
}

.variable-card {
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.variable-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
  border-color: #cbd5e0;
}

.card-content {
  padding: 1.5rem;
  flex: 1;
}

.card-content h4 {
  color: #1a252f;
  margin: 0 0 0.8rem 0;
  font-size: 1.2rem;
  font-weight: 600;
}

.description {
  color: #555;
  margin: 0;
  line-height: 1.6;
}

.variable-actions {
  display: flex;
  border-top: 1px solid #edf2f7;
  padding: 1rem;
  gap: 0.8rem;
}

.btn-edit {
  flex: 1;
  background-color: #42b983;
  color: white;
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
}

.btn-edit:hover {
  background-color: #3aa876;
}

.btn-delete {
  flex: 1;
  background-color: #fef2f2;
  color: #dc3545;
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
  background-color: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
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
.fas {
  font-size: 1rem;
}


.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(30, 41, 59, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 2rem 2.5rem;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
  min-width: 350px;
  max-width: 90vw;
  text-align: center;
}
</style>