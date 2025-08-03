// lib/api.ts
import axios, { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

// Untuk debugging
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.gongkomodotour.com';
console.log('API Base URL:', API_BASE_URL);

// 1. Buat Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  withCredentials: false, // Tidak perlu credentials untuk API
  timeout: 30000, // Menambahkan timeout 30 detik
  // Tambahkan proxy untuk bypass CORS issue
  proxy: false
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
  try {
    console.log(`Making ${method} request to ${url}`);
    const response = await api({
      method,
      url,
      data,
      ...config,
    });
    console.log(`Successful response from ${url}`, response.status);
    return response.data;
  } catch (error: any) {
    console.error(`Error in apiRequest to ${url}:`, error.message);
    
    // If axios fails, try with native fetch as fallback
    if (!error.response && method === 'GET') {
      console.log('Attempting fallback with XHR');
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const fullUrl = `${API_BASE_URL}${url}`;
        
        xhr.open(method, fullUrl, true);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        
        xhr.timeout = 30000;
        
        xhr.onload = function() {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              console.log('XHR fallback successful', response);
              resolve(response as T);
            } catch (e) {
              reject(new Error(`JSON parse error: ${e}`));
            }
          } else {
            reject(new Error(`HTTP error status: ${xhr.status}`));
          }
        };
        
        xhr.onerror = function() {
          console.error('XHR error occurred');
          reject(new Error('Network error occurred'));
        };
        
        xhr.ontimeout = function() {
          reject(new Error('Request timed out'));
        };
        
        xhr.send();
      });
    }
    
    throw error;
  }
}

// 4. Error handler global untuk menangani token expired
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log error details for debugging
    console.error('API Error:', {
      message: error.message,
      config: error.config,
      status: error.response?.status,
      data: error.response?.data
    });

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
    
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout - consider increasing the timeout value');
    }
    
    if (!error.response) {
      console.error('Network error - check your internet connection or API endpoint availability');
    }
    
    return Promise.reject(error);
  }
);

// 5. Export default instance dan apiRequest
export default api;
