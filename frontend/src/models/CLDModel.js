// CLD Model - Represents the data structure of a Causal Loop Diagram
export class CLDModel {
  constructor(data = {}) {
    this.id = data.id || data._id || null;
    this.name = data.name || data.title || '';
    this.description = data.description || '';
    this.date = data.date || data.createdAt || new Date().toISOString().split('T')[0];
    
    // Store variable count that comes from the backend
    this.variable_count = data.variable_count || 0;
    
    // Store variable IDs
    if (data.variables) {
      this.variables = Array.isArray(data.variables) ? data.variables : [];
    } else {
      this.variables = [];
    }
    
    // Handle relationships (connections between variables)
    if (data.relationships) {
      this.relationships = data.relationships;
    } else if (data.edges) {
      // Convert from edges format to relationships format
      this.relationships = data.edges.map(edge => ({
        source_id: edge.source,
        target_id: edge.target,
        type: edge.polarity === 'positive' ? 'POSITIVE' : 'NEGATIVE'
      }));
    } else if (data.variable_clds) {
      // Convert from variable_clds format to relationships format
      this.relationships = data.variable_clds.map(rel => ({
        source_id: rel.from_variable_id || rel.source_id,
        target_id: rel.to_variable_id || rel.target_id,
        type: (rel.type || '').toUpperCase()
      }));
    } else {
      this.relationships = [];
    }
    
    // Store nodes/variables separately for internal use
    this._nodes = data.nodes || [];
    
    // Store feedback loops
    this.feedback_loops = data.feedback_loops || [];
    
    // Store archetypes
    this.archetypes = data.archetypes || [];
    
    this.userId = data.userId || data.user_id || null;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || data.date || new Date();
    
    console.log('CLDModel constructed:', this);
  }

  // Convert raw data to model instance
  static fromJSON(json) {
    if (!json) {
      console.warn('Attempted to create CLDModel from null/undefined data');
      return new CLDModel();
    }
    return new CLDModel(json);
  }

  // Convert model to JSON for API requests
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      date: this.date,
      variables: this.variables,
      relationships: this.relationships,
      feedback_loops: this.feedback_loops,
      archetypes: this.archetypes,
      variable_count: this.variable_count || this.variables.length
    };
  }
  
  // Helper methods to maintain backward compatibility
  get title() {
    return this.name;
  }
  
  set title(value) {
    this.name = value;
  }
  
  get nodes() {
    // Return either stored nodes or variables as nodes for backward compatibility
    return this._nodes.length > 0 ? this._nodes : this.variables || [];
  }
  
  set nodes(value) {
    this._nodes = value;
    // Also update variables array with IDs if available
    if (Array.isArray(value)) {
      this.variables = value.map(node => typeof node === 'object' ? (node.id || node._id) : node)
        .filter(id => id); // Filter out any null/undefined IDs
    }
  }
  
  get edges() {
    return this.relationships.map(rel => ({
      source: rel.source_id,
      target: rel.target_id,
      polarity: rel.type?.toLowerCase() === 'positive' ? 'positive' : 'negative'
    }));
  }
  
  set edges(value) {
    this.relationships = value.map(edge => ({
      source_id: edge.source,
      target_id: edge.target,
      type: edge.polarity === 'positive' ? 'POSITIVE' : 'NEGATIVE'
    }));
  }
} 