import axios, { AxiosError } from 'axios';
import { useAuthStore } from '@/stores/authStore';
import type {
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
  Product,
  CreateProductDto,
  UpdateProductDto,
  PaginatedResponse,
  PaginationParams,
  User,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // IMPORTANT for HttpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- REQUEST INTERCEPTOR ---
api.interceptors.request.use(
  (config) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- RESPONSE INTERCEPTOR (HANDLE 401) ---
let isRefreshing = false;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;

        try {
          const refreshResponse = await api.post('/auth/refresh'); // refresh cookie
          const { access_token } = refreshResponse.data;

          // update Zustand store
          useAuthStore.getState().accessToken = access_token;

          isRefreshing = false;

          // retry original request
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        } catch (err: unknown) {
          isRefreshing = false;
          // If it's a network error (backend is down), clear state directly
          // Otherwise, try to logout via API (which will also clear state on failure)
          if (err instanceof AxiosError && (err.code === 'ERR_NETWORK' || !err.response)) {
            useAuthStore.setState({
              user: null,
              accessToken: null,
              isAuthenticated: false,
            });
          } else {
            useAuthStore.getState().logout();
          }
          return Promise.reject(err);
        }
      }
    }

    return Promise.reject(error);
  }
);

// --- AUTH API ---
export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/login', credentials);
    return data;
  },

  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/register', credentials);
    return data;
  },

  refresh: async (): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/refresh');
    return data;
  },

  getCurrentUser: async (): Promise<User> => {
    const { data } = await api.get<User>('/users/me');
    return data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },
};

// --- PRODUCTS API ---
export const productsApi = {
  getAll: async (params: PaginationParams): Promise<PaginatedResponse<Product>> => {
    const { data } = await api.get('/products', { params });
    return data;
  },

  getById: async (id: number): Promise<Product> => {
    const { data } = await api.get(`/products/${id}`);
    return data;
  },

  create: async (product: CreateProductDto): Promise<Product> => {
    const { data } = await api.post('/products', product);
    return data;
  },

  update: async (id: number, product: UpdateProductDto): Promise<Product> => {
    const { data } = await api.put(`/products/${id}`, product);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/products/${id}`);
  },
};

export default api;
