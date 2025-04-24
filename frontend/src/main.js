import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import axios from 'axios'

// Configure axios defaults
axios.defaults.baseURL = 'http://localhost:5001'
axios.defaults.headers.common['Accept'] = 'application/json'
axios.defaults.headers.common['Content-Type'] = 'application/json'

axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  console.log('Current token in localStorage:', token)
  if (token) {
    config.headers['Authorization'] = token
    console.log('Request headers:', config.headers)
  }
  return config
})

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
