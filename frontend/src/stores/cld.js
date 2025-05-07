import { defineStore } from 'pinia';
import CLDService from '@/services/cld.service';
import { CLDModel } from '@/models/CLDModel';

export const useCLDStore = defineStore('cld', {
  state: () => ({
    diagrams: [],
    currentDiagram: null,
    loading: false,
    error: null,
  }),
  
  getters: {
    getDiagramById: (state) => (id) => {
      return state.diagrams.find(diagram => diagram.id === id);
    },
    
    filteredDiagrams: (state) => (filter = '') => {
      if (!filter) return state.diagrams;
      
      return state.diagrams.filter(diagram => 
        diagram.title.toLowerCase().includes(filter.toLowerCase()) ||
        diagram.description.toLowerCase().includes(filter.toLowerCase())
      );
    },
    
    sortedDiagrams: (state) => (sorting = 'newest') => {
      const diagramsToSort = [...state.diagrams];
      
      switch (sorting) {
        case 'newest':
          return diagramsToSort.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        case 'oldest':
          return diagramsToSort.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        case 'alphabetical':
          return diagramsToSort.sort((a, b) => a.title.localeCompare(b.title));
        default:
          return diagramsToSort;
      }
    }
  },
  
  actions: {
    async fetchDiagrams() {
      this.loading = true;
      this.error = null;
      
      try {
        this.diagrams = await CLDService.getAllCLDs();
      } catch (error) {
        this.error = error.message || 'Failed to fetch diagrams';
        console.error(error);
      } finally {
        this.loading = false;
      }
    },
    
    async fetchDiagramById(id) {
      this.loading = true;
      this.error = null;
      
      try {
        this.currentDiagram = await CLDService.getCLDById(id);
      } catch (error) {
        this.error = error.message || 'Failed to fetch diagram';
        console.error(error);
      } finally {
        this.loading = false;
      }
    },
    
    async createDiagram(diagramData) {
      this.loading = true;
      this.error = null;
      
      try {
        const newDiagram = await CLDService.createCLD(diagramData);
        this.diagrams.push(newDiagram);
        return newDiagram;
      } catch (error) {
        this.error = error.message || 'Failed to create diagram';
        console.error(error);
        return null;
      } finally {
        this.loading = false;
      }
    },
    
    async updateDiagram(id, diagramData) {
      this.loading = true;
      this.error = null;
      
      try {
        const updatedDiagram = await CLDService.updateCLD(id, diagramData);
        
        // Update in diagrams array
        const index = this.diagrams.findIndex(d => d.id === id);
        if (index !== -1) {
          this.diagrams[index] = updatedDiagram;
        }
        
        // Update current diagram if it's the one being edited
        if (this.currentDiagram && this.currentDiagram.id === id) {
          this.currentDiagram = updatedDiagram;
        }
        
        return updatedDiagram;
      } catch (error) {
        this.error = error.message || 'Failed to update diagram';
        console.error(error);
        return null;
      } finally {
        this.loading = false;
      }
    },
    
    async deleteDiagram(id) {
      this.loading = true;
      this.error = null;
      
      try {
        await CLDService.deleteCLD(id);
        this.diagrams = this.diagrams.filter(diagram => diagram.id !== id);
        
        // Clear current diagram if it's the one being deleted
        if (this.currentDiagram && this.currentDiagram.id === id) {
          this.currentDiagram = null;
        }
        
        return true;
      } catch (error) {
        this.error = error.message || 'Failed to delete diagram';
        console.error(error);
        return false;
      } finally {
        this.loading = false;
      }
    },
    
    // Helper method to create an empty diagram
    createEmptyDiagram() {
      return new CLDModel({
        title: 'Untitled Diagram',
        description: '',
        nodes: [],
        edges: []
      });
    }
  }
}); 