// lib/api.ts
import axios, { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

// Untuk debugging
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
console.log('API Base URL:', API_BASE_URL);

// 1. Buat Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  withCredentials: true, // Enable credentials untuk CSRF token
  timeout: 30000, // Menambahkan timeout 30 detik
  // Tambahkan proxy untuk bypass CORS issue
  proxy: false
});

// 2. Fungsi untuk mendapatkan CSRF token
async function getCsrfToken(): Promise<string | null> {
  try {
    const response = await axios.get(`${API_BASE_URL}/sanctum/csrf-cookie`, {
      withCredentials: true,
    });
    
    // Extract CSRF token from cookies
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'XSRF-TOKEN') {
        return decodeURIComponent(value);
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting CSRF token:', error);
    return null;
  }
}

// 3. Interceptor: tambahkan Bearer token dan CSRF token jika ada
api.interceptors.request.use(async (config: InternalAxiosRequestConfig<unknown>) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Tambahkan CSRF token untuk request yang memerlukan
    if (config.method && ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
      const csrfToken = await getCsrfToken();
      if (csrfToken && config.headers) {
        config.headers['X-XSRF-TOKEN'] = csrfToken;
      }
    }
  }
  return config;
});

// 4. Helper function apiRequest<T>
export async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  url: string,
  data?: Record<string, unknown> | FormData,
  config?: AxiosRequestConfig
): Promise<T> {
  try {
    console.log(`Making ${method} request to ${url}`);
    console.log('Request config:', { method, url, data, config });
    console.log('API Base URL:', API_BASE_URL);
    
    // Untuk request yang memerlukan CSRF token, pastikan kita mendapatkannya terlebih dahulu
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      await getCsrfToken();
    }
    
    const response = await api({
      method,
      url,
      data,
      ...config,
    });
    console.log(`Successful response from ${url}`, response.status);
    console.log('Response data:', response.data);
    return response.data;
  } catch (error: unknown) {
    const axiosError = error as { 
      message?: string; 
      response?: { status?: number }; 
      config?: unknown 
    };
    console.error(`Error in apiRequest to ${url}:`, axiosError.message || 'Unknown error');
    console.error('Full error object:', error);
    console.error('Error response:', axiosError.response);
    console.error('Error config:', axiosError.config);
    
    // If we get a 500 error, try alternative approaches
    if (axiosError.response?.status === 500) {
      console.log('Received 500 error, trying alternative approaches...');
      
      // Try 1: Direct fetch without axios
      try {
        console.log('Attempting direct fetch...');
        const fullUrl = `${API_BASE_URL}${url}`;
        const fetchResponse = await fetch(fullUrl, {
          method,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include', // Include credentials for CSRF
          body: data ? JSON.stringify(data) : undefined,
        });
        
        if (fetchResponse.ok) {
          const fetchData = await fetchResponse.json();
          console.log('Direct fetch successful:', fetchData);
          return fetchData as T;
        } else {
          console.error('Direct fetch failed:', fetchResponse.status, fetchResponse.statusText);
        }
      } catch (fetchError) {
        console.error('Direct fetch error:', fetchError);
      }
      
      // Try 2: XHR fallback
      if (method === 'GET') {
        console.log('Attempting XHR fallback...');
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const fullUrl = `${API_BASE_URL}${url}`;
          
          xhr.open(method, fullUrl, true);
          xhr.setRequestHeader('Accept', 'application/json');
          xhr.setRequestHeader('Content-Type', 'application/json');
          xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
          xhr.withCredentials = true; // Enable credentials for CSRF
          
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
    }
    
    // If axios fails and no fallback worked, try with native fetch as fallback
    if (!axiosError.response && method === 'GET') {
      console.log('Attempting fallback with XHR');
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const fullUrl = `${API_BASE_URL}${url}`;
        
        xhr.open(method, fullUrl, true);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        xhr.withCredentials = true; // Enable credentials for CSRF
        
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
