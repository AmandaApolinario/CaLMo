import axios from 'axios';

// Create axios instance with baseURL
const apiClient = axios.create({
  // baseURL: 'http://localhost:5001',  // Direct connection to backend at port 5001
  baseURL: import.meta.env.VITE_API_URL || "/calmo/api",
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Add logging interceptors
apiClient.interceptors.request.use(
  config => {
    console.log(`API Request: ${config.method.toUpperCase()} ${config.baseURL}/${config.url}`, config.data);
    return config;
  },
  error => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  response => {
    console.log(`API Response: ${response.status} from ${response.config.url}`, response.data);
    return response;
  },
  error => {
    console.error('API Response Error:', error.response?.status, error.message);
    console.error('Error details:', error.response?.data);
    return Promise.reject(error);
  }
);

class ApiService {
  constructor() {
    this.axios = apiClient;
  }

  setHeader() {
    const token = localStorage.getItem('token');
    if (token) {
      this.axios.defaults.headers.common['Authorization'] = token;
    }
  }

  get(resource, params) {
    this.setHeader();
    return this.axios.get(`${resource}`, { params });
  }

  post(resource, data) {
    this.setHeader();
    return this.axios.post(`${resource}`, data);
  }

  put(resource, data) {
    this.setHeader();
    return this.axios.put(`${resource}`, data);
  }

  delete(resource) {
    this.setHeader();
    return this.axios.delete(`${resource}`);
  }
}

export default new ApiService(); 