import { create } from 'zustand';
import { AxiosError } from 'axios';
import { authApi } from '../services/api';
import type { User, LoginCredentials, RegisterCredentials } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  initAuth: () => Promise<void>;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,

  // Called on app start to refresh access token using HttpOnly refresh cookie
  initAuth: async () => {
    try {
      const response = await authApi.refresh(); 
      set({
        user: response.user,
        accessToken: response.access_token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err: unknown) {
      // 401 is expected when there's no valid refresh token (user not logged in)
      // Network errors are expected when backend is not running
      // Only log unexpected server errors (500s, etc.)
      const isExpectedError = 
        (err instanceof AxiosError && err.response?.status === 401) ||
        (err instanceof AxiosError && err.code === 'ERR_NETWORK') ||
        (err instanceof Error && err.message === 'Network Error');
      
      if (!isExpectedError) {
        console.error('initAuth error:', err);
      }
      set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
    }
  },

  // Login → backend returns access token + sets HttpOnly refresh cookie
  login: async (credentials) => {
    try {
      const response = await authApi.login(credentials);
      set({
        user: response.user,
        accessToken: response.access_token,
        isAuthenticated: true,
      });
    } catch (err: unknown) {
      // Provide better error messages for network errors
      if (
        (err instanceof AxiosError && err.code === 'ERR_NETWORK') ||
        (err instanceof Error && err.message === 'Network Error')
      ) {
        const networkError = new Error('Cannot connect to server. Please make sure the backend is running.');
        throw networkError;
      }
      console.error('Login failed:', err);
      throw err;
    }
  },

  // Register → creates account but does NOT automatically log in
  register: async (credentials) => {
    try {
      await authApi.register(credentials);
      // Don't set authentication state - user needs to login manually
    } catch (err) {
      console.error('Register failed:', err);
      throw err;
    }
  },

  // Logout → backend clears refresh cookie
  logout: async () => {
    try {
      await authApi.logout();
    } catch (err) {
      // If logout API call fails (e.g., backend is down), still clear local state
      console.warn('Logout API call failed, clearing local state anyway:', err);
    } finally {
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
      });
    }
  },
}));
