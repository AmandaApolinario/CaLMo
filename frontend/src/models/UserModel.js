// User Model - Represents the data structure of a User
export class UserModel {
  constructor(data = {}) {
    this.id = data.id || data._id || null;
    this.username = data.username || data.name || '';
    this.email = data.email || '';
    this.createdAt = data.createdAt || data.created_at || new Date();
    
    console.log("UserModel created with:", {
      id: this.id,
      username: this.username,
      email: this.email
    });
  }

  // Convert raw data to model instance
  static fromJSON(json) {
    console.log("Creating UserModel from JSON:", json);
    if (!json) {
      console.warn("Attempted to create UserModel from null/undefined");
      return null;
    }
    return new UserModel(json);
  }

  // Convert model to JSON for API requests
  toJSON() {
    return {
      id: this.id,
      username: this.username,
      email: this.email
    };
  }
} 