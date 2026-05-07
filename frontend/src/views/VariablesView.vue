<template>
  <div class="variables-container">
    <NavBar />
    <div class="variables-content">
      <div class="header">
        <h1>Variables Management</h1>
      </div>

      <div v-if="message && message.includes('Successfully')" class="global-success">
        <i class="fas fa-check-circle"></i> {{ message }}
      </div>
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
              <textarea
                id="name"
                v-model="newVariable.name"
                required
                maxlength="512"
                placeholder="Enter variable name"
                class="form-textarea"
                rows="2"
              ></textarea>
            </div>
            <div class="form-group">
              <label for="description">Description</label>
              <textarea
                id="description"
                v-model="newVariable.description"
                placeholder="Enter variable description"
                class="form-textarea"
                rows="6"
              ></textarea>
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
            <div class="variables-info">
              <h3>Your Variables</h3>
              <div class="total-count">{{ variables.length }} variables</div>
            </div>
            <div class="actions">
              <div v-if="variables.length > 0" class="list-controls">
                <label class="select-all-container">
                  <input
                    type="checkbox"
                    :checked="selectedVariables.length === variables.length && variables.length > 0"
                    @change="toggleSelectAll"
                  >
                  <span class="checkmark"></span>
                  Select All
                </label>
              </div>
              <div class="header-actions">
                  <input
                    type="file"
                    ref="fileInput"
                    @change="handleFileUpload"
                    accept=".json,.csv,.xmile,.stmx"
                    style="display: none;"
                  />
                  <button @click="triggerFileInput" class="btn-edit" :disabled="isImporting">
                    <i class="fas" :class="isImporting ? 'fa-spinner fa-spin' : 'fa-file-import'"></i>
                    {{ isImporting ? 'Importing...' : 'Import Variables' }}
                  </button>
                </div>
            </div>

            <transition name="fade">
              <div v-if="selectedVariables.length > 0" class="bulk-actions">
                <span class="selected-count">{{ selectedVariables.length }} selected</span>
                <div class="divider"></div>
                <span class="export-label">Export as:</span>
                <div class="export-group">
                  <button @click="exportSelectedVariables('json')" title="Export as JSON" class="btn-export-sm">JSON</button>
                  <button @click="exportSelectedVariables('csv')" title="Export as CSV" class="btn-export-sm">CSV</button>
                  <button @click="exportSelectedVariables('xmile')" title="Export as XMILE" class="btn-export-sm">XMILE</button>
                </div>
                <div class="divider"></div>
                <button @click="confirmBulkDelete" class="btn-delete-bulk">
                  <i class="fas fa-trash-alt"></i> Delete Selected
                </button>
              </div>
            </transition>
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
            <div v-for="variable in variables" :key="variable.id" class="variable-card" :class="{ 'is-selected': selectedVariables.includes(variable.id) }">
              <label class="card-checkbox">
                <input type="checkbox" :value="variable.id" v-model="selectedVariables">
                <span class="checkmark"></span>
              </label>
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
</template>

<script setup>
import {onMounted, ref} from 'vue'
import NavBar from '../components/NavBar.vue'
import { useVariablesViewModel } from '@/viewmodels/VariablesViewModel'

// Initialize ViewModel
const {
  variables,
  loading,
  error,
  message,
  isEditing,
  newVariable,
  fetchVariables,
  submitForm,
  deleteVariable,
  startEditing,
  cancelEditing,
  importVariablesFromFile,
  isImporting,
  exportSelectedVariables,
  deleteSelectedVariables,
  selectedVariables,
  toggleSelectAll
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

const fileInput = ref(null);

const triggerFileInput = () => {
  if (fileInput.value) {
    fileInput.value.click();
  }
};

const handleFileUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  await importVariablesFromFile(file);
  event.target.value = '';
};

const confirmBulkDelete = async () => {
  if (!confirm(`Are you sure you want to delete ${selectedVariables.value.length} variables? This action cannot be undone.`)) return
  await deleteSelectedVariables()
}

onMounted(() => {
  fetchVariables()
})
</script>

<style scoped>
.variables-container {
  min-height: 100vh;
  width: 100%;
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
  display: flex;
  align-items: center;
  justify-content: space-between;
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

.form-input, .form-textarea {
  padding: 0.9rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s ease;
  width: 100%;
}

.form-input:focus, .form-textarea:focus {
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

.variable-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 1.8rem;
  margin-top: 1.5rem;
}

.variable-card {
  position: relative;
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  border: 2px solid #e2e8f0; transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.variable-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
  border-color: #cbd5e0;
}

.variable-card.is-selected {
  border-color: #42b983;
  background-color: #f8fdfa;
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.3);
}

.card-content {
  padding: 1.5rem 1.5rem 1.5rem 3.5rem;
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
.btn-edit-action {
  flex: 1;
  background-color: #42b983;
  color: white;
  padding: 0.7rem;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer; transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}
.btn-edit-action:hover {
  background-color: #3aa876;
}
.btn-delete-action {
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
.btn-delete-action:hover {
  background-color: #fee2e2;
}

.card-checkbox { position: absolute; top: 1.5rem; left: 1rem; cursor: pointer; }
.select-all-container {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-weight: 600;
  color: #4a5568;
  font-size: 0.95rem;
  user-select: none;
}
.card-checkbox input, .select-all-container input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}
.checkmark {
  position: relative;
  display: inline-block;
  height: 22px; width: 22px;
  background-color: #fff;
  border: 2px solid #cbd5e0;
  border-radius: 6px;
  transition: all 0.2s;
  margin-right: 0.5rem;
}
.card-checkbox:hover input ~ .checkmark, .select-all-container:hover input ~ .checkmark {
  background-color: #f1f5f9;
  border-color: #a0aec0;
}
.card-checkbox input:checked ~ .checkmark, .select-all-container input:checked ~ .checkmark {
  background-color: #42b983;
  border-color: #42b983;
}
.checkmark:after {
  content: "";
  position: absolute;
  display: none;
  left: 6px;
  top: 2px;
  width: 5px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}
.card-checkbox input:checked ~ .checkmark:after, .select-all-container input:checked ~ .checkmark:after {
  display: block;
}



.list-controls { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.8rem; }
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
.export-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
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
  border-color: #dc2626;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.variables-info {
  display: flex;
  gap: 2rem;
}

.actions {
  display: flex;
  gap: 2rem;
  align-items: center
}

</style>