// lib/api.ts
import axios, { AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// 1. Buat Axios instance
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  headers: {
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

// 2. Interceptor: tambahkan Bearer token jika ada
api.interceptors.request.use((config: InternalAxiosRequestConfig<unknown>) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return config;
});

// 3. Helper function apiRequest<T>
export async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  url: string,
  data?: Record<string, unknown> | FormData,
  config?: AxiosRequestConfig
): Promise<AxiosResponse<T>> {
  return api({
    method,
    url,
    data,
    ...config,
  });
}

// 4. (Opsional) Tambahkan error handler global (misal 401 auto logout)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      // window.location.href = '/auth/login'; // Uncomment jika mau auto-redirect
    }
    return Promise.reject(error);
  }
);

// 5. Export default instance dan apiRequest
export default api;
