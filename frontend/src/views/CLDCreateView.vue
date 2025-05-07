<template>
  <div class="create-cld-container">
    <NavBar />
    <div class="cld-content">
      <h1>Create New CLD</h1>

      <div v-if="loading" class="loading-message">
        <div class="spinner"></div>
        <p>Loading...</p>
      </div>

      <div v-else class="form-container">
        <form @submit.prevent="handleSubmit" class="cld-form">
          <div class="form-columns">
            <!-- Left Column -->
            <div class="form-left">
              <!-- CLD Name -->
              <div class="form-group">
                <label for="name">CLD Name</label>
                <input 
                  type="text" 
                  id="name" 
                  v-model="diagram.title" 
                  placeholder="Enter CLD name"
                  required
                >
              </div>

              <!-- Description -->
              <div class="form-group">
                <label for="description">Description</label>
                <textarea 
                  id="description" 
                  v-model="diagram.description" 
                  placeholder="Enter CLD description"
                  rows="6"
                ></textarea>
              </div>

              <!-- Date -->
              <div class="form-group">
                <label for="date">Date</label>
                <input 
                  type="date" 
                  id="date" 
                  v-model="diagram.createdAt" 
                  required
                >
              </div>
            </div>

            <!-- Right Column -->
            <div class="form-right">
              <!-- Variable Relationships -->
              <div class="form-group">
                <label>Variable Relationships</label>
                <div v-if="variables.length === 0" class="no-variables-message">
                  <p>No variables available. Please create variables first.</p>
                  <button type="button" @click="goToVariables" class="btn-secondary">
                    Go to Variables
                  </button>
                </div>
                <div v-else class="relationships-container">
                  <div v-for="(edge, index) in diagram.edges" :key="index" class="relationship">
                    <div class="relationship-row">
                      <select v-model="edge.source" 
                              @change="edge.target && checkForConflictingRelationship(index)" 
                              required 
                              class="relationship-select">
                        <option value="">Select source variable</option>
                        <option v-for="variable in variables" :key="variable.id" :value="variable.id">
                          {{ variable.name }}
                        </option>
                      </select>
                      
                      <select v-model="edge.polarity" 
                              @change="edge.source && edge.target && checkForConflictingRelationship(index)"
                              required 
                              class="relationship-type">
                        <option value="positive">+ (Positive)</option>
                        <option value="negative">- (Negative)</option>
                      </select>
                      
                      <select v-model="edge.target" 
                              @change="checkForConflictingRelationship(index)"
                              required 
                              class="relationship-select">
                        <option value="">Select target variable</option>
                        <option v-for="variable in filteredTargetVariables(edge.source)" 
                                :key="variable.id" 
                                :value="variable.id">
                          {{ variable.name }}
                        </option>
                      </select>
                      
                      <button type="button" @click="() => removeEdge(index)" class="btn-delete">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
                <button 
                  v-if="variables.length > 0" 
                  type="button" 
                  @click="addEdge" 
                  class="btn-add"
                >
                  <i class="fas fa-plus"></i> Add Relationship
                </button>
              </div>
            </div>
          </div>

          <!-- Submit and Cancel -->
          <div class="form-actions">
            <button type="button" @click="goToDashboard" class="btn-cancel">Cancel</button>
            <button 
              type="submit" 
              :disabled="saving || variables.length === 0" 
              class="btn-submit"
            >
              {{ saving ? 'Creating...' : 'Create CLD' }}
            </button>
          </div>
        </form>

        <!-- Messages -->
        <div class="messages-container">
          <div v-if="successMessage" class="success-message">
            <i class="fas fa-check-circle"></i> {{ successMessage }}
          </div>
          <div v-if="error" class="error-message">
            <i class="fas fa-exclamation-circle"></i> {{ error }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import NavBar from '../components/NavBar.vue'
import { useCLDEditorViewModel } from '@/viewmodels/CLDEditorViewModel'

const router = useRouter()

// Initialize the CLD Editor ViewModel
const { 
  diagram,
  variables,
  loading,
  saving,
  error,
  successMessage,
  createEmptyDiagram,
  resetDiagram,
  fetchVariables,
  createDiagram,
  addEdge,
  removeEdge,
  filteredTargetVariables,
  validateDiagram
} = useCLDEditorViewModel()

// Initialize with an empty diagram
onMounted(async () => {
  console.log('CLDCreateView mounted');
  try {
    // Reset the diagram to start fresh
    resetDiagram();
    
    // Fetch variables for relationships
    await fetchVariables();
    
    // Add one empty relationship by default if we have variables
    if (variables.value && variables.value.length > 0) {
      addEdge();
    }
  } catch (err) {
    console.error('Error initializing CLDCreateView:', err);
  }
})

// Clean up on component unmount
onBeforeUnmount(() => {
  console.log('CLDCreateView unmounting');
})

const handleSubmit = async () => {
  // Validate the diagram data
  const validationError = validateDiagram()
  if (validationError) {
    error.value = validationError
    return
  }
  
  // Create the diagram
  try {
    const newDiagram = await createDiagram(diagram.value)
    if (newDiagram) {
      // Redirect to the diagram list after successful creation
      setTimeout(() => {
        router.push('/clds')
      }, 1000)
    }
  } catch (err) {
    console.error('Error creating diagram:', err);
  }
}

const goToDashboard = () => {
  router.push('/dashboard')
}

const goToVariables = () => {
  router.push('/variables')
}

const checkForConflictingRelationship = (index) => {
  const currentEdge = diagram.value.edges[index];
  
  // Skip if the edge is not fully defined
  if (!currentEdge.source || !currentEdge.target || !currentEdge.polarity) {
    return;
  }
  
  // Check if there's already a relationship between these variables with a different polarity
  for (let i = 0; i < diagram.value.edges.length; i++) {
    if (i === index) continue; // Skip the current edge
    
    const otherEdge = diagram.value.edges[i];
    
    // Skip incomplete edges
    if (!otherEdge.source || !otherEdge.target || !otherEdge.polarity) {
      continue;
    }
    
    // Check if exactly the same variables are connected in the same direction
    const sameDirectionalRelationship = 
      (currentEdge.source === otherEdge.source && currentEdge.target === otherEdge.target);
    
    if (sameDirectionalRelationship && currentEdge.polarity !== otherEdge.polarity) {
      error.value = `Conflicting relationship: Cannot have both positive and negative relationships between the same variables in the same direction`;
      
      // Reset the last selection 
      currentEdge.target = '';
      
      // Clear the error after 5 seconds
      setTimeout(() => {
        error.value = null;
      }, 5000);
      
      break;
    }
  }
}
</script>

<style scoped>
.create-cld-container {
  min-height: 100vh;
  background-color: #f5f7fa;
}

.cld-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

h1 {
  font-size: 2.5rem;
  color: #1a252f;
  margin-bottom: 2rem;
  text-align: center;
}

.form-container {
  background-color: white;
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.form-columns {
  display: flex;
  gap: 2rem;
}

.form-left {
  flex: 1;
  min-width: 400px;
}

.form-right {
  flex: 2;
  min-width: 600px;
}

.cld-form {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

label {
  font-size: 1.1rem;
  color: #1a252f;
  font-weight: 500;
}

input, textarea, select {
  padding: 0.75rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s ease;
  width: 100%;
}

input:focus, textarea:focus, select:focus {
  outline: none;
  border-color: #42b983;
  box-shadow: 0 0 0 3px rgba(66, 185, 131, 0.2);
}

textarea {
  resize: vertical;
  min-height: 150px;
}

.relationships-container {
  max-height: 400px;
  overflow-y: auto;
  padding: 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background-color: #f8fafc;
}

.relationship {
  margin-bottom: 1rem;
}

.relationship-row {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.relationship-select {
  flex: 2;
}

.relationship-type {
  flex: 1;
  max-width: 120px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
}

button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-submit {
  background-color: #42b983;
  color: white;
}

.btn-submit:hover {
  background-color: #3aa876;
  transform: translateY(-2px);
}

.btn-submit:disabled {
  background-color: #a8d5c1;
  transform: none;
  cursor: not-allowed;
}

.btn-cancel {
  background-color: #e2e8f0;
  color: #1a252f;
}

.btn-cancel:hover {
  background-color: #cbd5e0;
}

.btn-add {
  background-color: #2c3e50;
  color: white;
  margin-top: 1rem;
}

.btn-add:hover {
  background-color: #1a252f;
}

.btn-secondary {
  background-color: #4f46e5;
  color: white;
  margin-top: 1rem;
}

.btn-secondary:hover {
  background-color: #4338ca;
}

.btn-delete {
  background-color: #fee2e2;
  color: #dc3545;
  padding: 0.5rem;
  border-radius: 50%;
  min-width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1rem;
  flex-shrink: 0;
}

.btn-delete:hover {
  background-color: #fecaca;
}

.messages-container {
  margin-top: 2rem;
}

.success-message {
  background-color: #d4edda;
  color: #155724;
  padding: 1rem;
  border-radius: 8px;
  border-left: 4px solid #28a745;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.error-message {
  background-color: #f8d7da;
  color: #721c24;
  padding: 1rem;
  border-radius: 8px;
  border-left: 4px solid #dc3545;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.loading-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  background-color: white;
  border-radius: 16px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border-left-color: #42b983;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

.no-variables-message {
  background-color: #f8fafc;
  padding: 2rem;
  text-align: center;
  border-radius: 8px;
  border: 1px dashed #cbd5e0;
}

.no-variables-message p {
  margin-bottom: 1rem;
  color: #64748b;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Font Awesome icons */
.fas {
  font-size: 1.2rem;
}
</style>