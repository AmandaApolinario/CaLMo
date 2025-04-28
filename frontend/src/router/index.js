import { createRouter, createWebHistory } from 'vue-router'
import LandingView from '../views/LandingView.vue'
import RegisterView from '../views/RegisterView.vue'
import DashboardView from '../views/DashboardView.vue'
import CLDListView from '../views/CLDListView.vue'
import CLDDetailView from '../views/CLDDetailView.vue'
import CLDEditView from '../views/CLDEditView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'landing',
      component: LandingView
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterView
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardView,
      meta: { requiresAuth: true }
    },
    {
      path: '/variables',
      name: 'variables',
      component: () => import('../views/VariablesView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/clds',
      name: 'clds',
      component: CLDListView,
      meta: { requiresAuth: true }
    },
    {
      path: '/cld/:id',
      name: 'cld-detail',
      component: CLDDetailView,
      meta: { requiresAuth: true }
    },
    {
      path: '/cld/:id/edit',
      component: CLDEditView,
      meta: { requiresAuth: true }
    },
    {
      path: '/cld/new',
      name: 'cld-new',
      component: () => import('../views/CLDCreateView.vue'),
      meta: { requiresAuth: true }
    }
  ]
})

// Navigation guard to check authentication
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  
  if (to.meta.requiresAuth && !token) {
    next('/')
  } else {
    next()
  }
})

export default router 