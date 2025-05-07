import { ref, computed } from 'vue';
import AuthService from '@/services/auth.service';

export function useAuthViewModel() {
  const loading = ref(false);
  const error = ref(null);
  const successMessage = ref('');

  const isAuthenticated = computed(() => {
    return AuthService.isAuthenticated();
  });

  async function login(credentials) {
    loading.value = true;
    error.value = null;
    successMessage.value = '';
    
    try {
      await AuthService.login(credentials);
      console.log("Login successful");
      return true;
    } catch (err) {
      error.value = err.message || 'Failed to login';
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function register(userData) {
    loading.value = true;
    error.value = null;
    successMessage.value = '';
    
    try {
      console.log("ViewModel: Registering user with data:", userData);
      const result = await AuthService.register(userData);
      
      if (result && result.success) {
        successMessage.value = result.message || 'Registration successful';
        console.log("Registration successful:", successMessage.value);
        return true;
      }
      
      console.log("Registration successful");
      return true;
    } catch (err) {
      console.error("ViewModel: Registration error:", err);
      error.value = err.message || 'Failed to register';
      return false;
    } finally {
      loading.value = false;
    }
  }

  function logout() {
    AuthService.logout();
  }

  return {
    loading,
    error,
    successMessage,
    isAuthenticated,
    login,
    register,
    logout
  };
} 