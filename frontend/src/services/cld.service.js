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
      if (response.data && response.data.cld.id) {
        await this.generateLoopsAndArchetypes(response.data.cld.id);
      }
      
      return CLDModel.fromJSON(response.data.cld);
    } catch (error) {
      console.error('Error creating CLD:', error);
      console.error('Error response:', error.response?.data);
      throw new Error(error.response?.data?.message || error.message || 'Failed to create diagram');
    }
  }

  async updateCLD(id, cldData) {
    try {
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

      if(cldData.share_token){
        dataToSend.share_token = cldData.share_token;
      }
      if(cldData.subsystems){
        dataToSend.subsystems = cldData.subsystems;
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

  async generateShareToken(id) {
    try {
      const response = await ApiService.post(`cld/${id}/share`);
      return response.data.token;
    } catch (error) {
      console.error(`Error generating share token for CLD ${id}:`, error);
      throw new Error(error.response?.data?.message || 'Failed to generate share link');
    }
  }

  async revokeShareToken(id) {
    try {
      await ApiService.delete(`cld/${id}/share`);
      return true;
    } catch (error) {
      console.error(`Error revoking share token for CLD ${id}:`, error);
      throw new Error(error.response?.data?.message || 'Failed to revoke share link');
    }
  }

  async getSharedCLD(token) {
    try {
      const response = await ApiService.get(`cld/shared/${token}`);
      return CLDModel.fromJSON(response.data);
    } catch (error) {
      console.error(`Error fetching shared CLD with token ${token}:`, error);
      throw new Error(error.response?.data?.message || 'Invalid or revoked link');
    }
  }

  async generateLiveLoopsAndArchetypes(nodes, edges) {
    try {
      const payload = { nodes, edges };

      const response = await ApiService.post(`cld/analyze`, payload);

      return response.data;
    } catch (error) {
      console.error('Error generating live loops and archetypes:', error);
      return null;
    }
  }

  async getReusableRelationships(excludeCldId = null) {
    try {
      const params = excludeCldId ? `?exclude_cld_id=${excludeCldId}` : '';
      const response = await ApiService.get(`cld/reusable-relationships${params}`);
      return response.data.relationships || [];
    } catch (error) {
      console.error('Error fetching reusable relationships:', error);
      return [];
    }
  }

  async getOwnerReusableRelationships(token, excludeCldId = null) {
    try {
      let params = `?token=${token}`;
      if (excludeCldId) params += `&exclude_cld_id=${excludeCldId}`;
      const response = await ApiService.get(`cld/shared/ownerRelationships${params}`);
      return response.data.relationships || [];
    } catch (error) {
      console.error('Error fetching owner reusable relationships:', error);
      return [];
    }
  }

  async createEmptyCLD(cldData) {
    try{
      console.log('CLD Service - Creating CLD with data:', cldData);
      const response = await ApiService.post('cld/create-empty', cldData);
      console.log('CLD Service - Create response:', response.data);

      if(response.data && response.data.cld_id) {
        return response.data.cld_id;
      }
    }catch (error) {
      console.error('Error creating CLD:', error);
      console.error('Error response:', error.response?.data);
      throw new Error(error.response?.data?.message || error.message || 'Failed to create diagram');
    }
  }
}

export default new CLDService(); 