import ApiService from './api.service';
import { CLDModel } from '@/models/CLDModel';

class CLDService {
  async getAllCLDs() {
    try {
      const response = await ApiService.get('clds');
      console.log('CLD Service - Get all CLDs response:', response.data);

      // Make sure we're dealing with an array before mapping
      if (Array.isArray(response.data)) {
        return response.data.map(item => CLDModel.fromJSON(item));
      } else {
        // If the backend response is not an array (e.g., it's an object with a message)
        console.warn('Expected array response from /clds, got:', response.data);
        // Return an empty array
        return [];
      }
    } catch (error) {
      console.error('Error fetching all CLDs:', error);
      // Return an empty array instead of throwing an error
      return [];
    }
  }

  async getCLDById(id) {
    try {
      const response = await ApiService.get(`cld/${id}`);
      return CLDModel.fromJSON(response.data);
    } catch (error) {
      console.error(`Error fetching CLD with ID ${id}:`, error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch diagram');
    }
  }

  async createCLD(cldData) {
    try {
      console.log('CLD Service - Creating CLD with data:', cldData);
      const response = await ApiService.post('cld', cldData);
      console.log('CLD Service - Create response:', response.data);

      // Generate feedback loops and archetypes for the new CLD
      if (response.data && response.data.id) {
        await this.generateLoopsAndArchetypes(response.data.id);
      }

      return CLDModel.fromJSON(response.data);
    } catch (error) {
      console.error('Error creating CLD:', error);
      console.error('Error response:', error.response?.data);
      throw new Error(error.response?.data?.message || error.message || 'Failed to create diagram');
    }
  }

  async updateCLD(id, cldData) {
    try {
      // Make sure we're sending all necessary CLD data, including variables and relationships
      const dataToSend = {
        name: cldData.name,
        description: cldData.description,
        date: cldData.date
      };

      // Include variables and relationships if present
      if (cldData.variables) {
        dataToSend.variables = cldData.variables;
      }

      if (cldData.relationships) {
        dataToSend.relationships = cldData.relationships;
      }

      console.log(`CLD Service - Updating CLD ${id} with data:`, dataToSend);
      const response = await ApiService.put(`cld/${id}`, dataToSend);
      console.log('CLD Service - Update response:', response.data);

      // The backend now returns the CLD data directly without nesting in a 'cld' property
      const updatedCLD = CLDModel.fromJSON(response.data);

      // Re-generate feedback loops and archetypes after update
      await this.generateLoopsAndArchetypes(id);

      // Fetch the latest CLD with all regenerated data
      return await this.getCLDById(id);
    } catch (error) {
      console.error(`Error updating CLD with ID ${id}:`, error);
      console.error('Error response:', error.response?.data);
      throw new Error(error.response?.data?.message || error.message || 'Failed to update diagram');
    }
  }

  async deleteCLD(id) {
    try {
      await ApiService.delete(`cld/${id}`);
      return true;
    } catch (error) {
      console.error(`Error deleting CLD with ID ${id}:`, error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to delete diagram');
    }
  }

  // Generate feedback loops and archetypes for a CLD
  async generateLoopsAndArchetypes(cldId) {
    if (!cldId) {
      console.error('Cannot generate loops and archetypes: No CLD ID provided');
      return;
    }

    try {
      console.log('Regenerating feedback loops for CLD:', cldId);
      // The POST request will replace existing data, not add to it
      const loopsResponse = await ApiService.post(`cld/${cldId}/feedback-loops`);
      console.log('Feedback loops regenerated:', loopsResponse.data);

      console.log('Regenerating archetypes for CLD:', cldId);
      // The POST request will replace existing data, not add to it
      const archetypesResponse = await ApiService.post(`cld/${cldId}/archetypes`);
      console.log('Archetypes regenerated:', archetypesResponse.data);

      // Return the CLD with updated loops and archetypes
      return await this.getCLDById(cldId);
    } catch (error) {
      console.error('Error generating loops and archetypes:', error);
      // Don't throw the error - we still want the creation/update to succeed
      // Just log it and return the original CLD
      return await this.getCLDById(cldId);
    }
  }

  async getCLDRelationshipsByID(cldId) {
    if (!cldId) {
      throw new Error('CLD ID is required to fetch relationships');
    }
    try {
      const response = await ApiService.get(`cld/${cldId}/relationships`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching relationships for CLD with ID ${cldId}:`, error);
      return [];
    }
  }

  async exportCLDsByIds(cldIds) {
    try {
      const response = await ApiService.post('cld/export-selected', { cld_ids: cldIds || [] });
      return response.data;
    } catch (error) {
      console.error('Error exporting CLDs:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to export diagrams');
    }
  }

  async importCLDs(cldDataArray) {
    try {
      const response = await ApiService.post('cld/import', { clds: cldDataArray || [] });
      return response.data;
    } catch (error) {
      console.error('Error importing CLDs:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to import diagrams');
    }
  }
}

export default new CLDService(); 