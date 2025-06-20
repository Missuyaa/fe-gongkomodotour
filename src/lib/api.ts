// lib/api.ts
import axios, { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

// 1. Buat Axios instance
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://api.gongkomodotour.com',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  withCredentials: false, // Tidak perlu credentials untuk API
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
): Promise<T> {
  const response = await api({
    method,
    url,
    data,
    ...config,
  });
  return response.data;
}

// 4. Error handler global untuk menangani token expired
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Bersihkan data dari localStorage
      localStorage.removeItem('access_token');
      localStorage.removeItem('token_type');
      localStorage.removeItem('user');
      
      // Redirect ke halaman login
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

// 5. Export default instance dan apiRequest
export default api;
