import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

// Create the app instance
const app = createApp(App)

// Initialize Pinia for state management
app.use(createPinia())

// Initialize Vue Router
app.use(router)

// Mount the app
app.mount('#app')
