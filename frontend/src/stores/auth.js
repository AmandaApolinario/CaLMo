import { defineStore } from 'pinia'
import axios from 'axios'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || null,
    user: JSON.parse(localStorage.getItem('user')) || null
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    getToken: (state) => state.token
  },

  actions: {
    async login(email, password) {
      try {
        const response = await axios.post('http://localhost:5001/login', {
          email,
          password
        })
        
        this.token = response.data.token
        localStorage.setItem('token', this.token)
        
        // Fetch user data
        const userResponse = await axios.get('http://localhost:5001/user', {
          headers: { Authorization: `Bearer ${this.token}` }
        })
        
        this.user = userResponse.data
        localStorage.setItem('user', JSON.stringify(this.user))
        
        return true
      } catch (error) {
        console.error('Login failed:', error)
        return false
      }
    },

    async register(name, email, password) {
      try {
        const response = await axios.post('http://localhost:5001/register', {
          name,
          email,
          password
        })
        return response.status === 201
      } catch (error) {
        console.error('Registration failed:', error)
        return false
      }
    },

    logout() {
      this.token = null
      this.user = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
  }
}) 