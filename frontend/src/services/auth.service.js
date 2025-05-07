import ApiService from './api.service';

class AuthService {
  async login(credentials) {
    try {
      const response = await ApiService.post('login', credentials);
      console.log("API login response:", response.data);
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
      } else {
        console.warn("No token in login response");
      }
      
      return response.data;
    } catch (error) {
      console.error("Login error:", error);
      throw new Error(error.response?.data?.message || error.message || 'Login failed');
    }
  }

  async register(userData) {
    try {
      console.log("Sending register request with data:", userData);
      
      // Format the data to match what the backend expects
      const formattedData = {
        name: userData.username || userData.name,
        email: userData.email,
        password: userData.password
      };
      
      console.log("Formatted register data:", formattedData);
      const response = await ApiService.post('register', formattedData);
      console.log("Register response:", response.data);
      
      // Check for success message in the response
      if (response.data && response.data.message) {
        console.log("Registration success message:", response.data.message);
        return {
          success: true,
          message: response.data.message
        };
      }
      
      return response.data;
    } catch (error) {
      console.error("Registration error:", error);
      console.error("Error details:", error.response?.data);
      throw new Error(error.response?.data?.message || error.message || 'Registration failed');
    }
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  isAuthenticated() {
    return !!localStorage.getItem('token');
  }
}

export default new AuthService(); 