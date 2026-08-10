import axios from 'axios';

const axiosClient = axios.create({
  baseURL: 'http://localhost:3000/api', // Cổng Backend của bạn
  headers: {
    'Content-Type': 'application/json',
  },
});

// INTERCEPTOR: Tự động đính kèm Token đăng nhập vào MỌI Request
axiosClient.interceptors.request.use(
  (config) => {
    // Lấy token từ localStorage (hoặc sessionStorage)
    const token = localStorage.getItem('token') || localStorage.getItem('user_token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosClient;