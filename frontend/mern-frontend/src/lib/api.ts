
import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import toast from 'react-hot-toast';

/* ======================================================
   Extend Axios config to support _retry
====================================================== */
declare module 'axios' {
  export interface AxiosRequestConfig {
    _retry?: boolean;
  }
}

/* ======================================================
   Axios Instance
====================================================== */

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // HttpOnly cookies
});

/* ======================================================
   Request Interceptor
====================================================== */

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

/* ======================================================
   Response Interceptor (Refresh Token)
====================================================== */

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError<any>) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        const refreshResponse = await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/refresh-token`,
          {},
          { withCredentials: true }
        );

        const { accessToken } = refreshResponse.data.data;
        localStorage.setItem('accessToken', accessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    const message =
      error.response?.data?.message ||
      error.message ||
      'An error occurred';

    if (error.response?.status !== 401) {
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

/* ======================================================
   Auth API
====================================================== */

export const authAPI = {
  register: (data: unknown) => api.post('/auth/register', data),
  verifyEmail: (data: unknown) => api.post('/auth/verify-email', data),
  resendVerification: (data: unknown) =>
    api.post('/auth/resend-verification', data),
  login: (data: unknown) => api.post('/auth/login', data, { withCredentials: true }),
  verifyTwoFactor: (data: unknown) => api.post('/auth/verify-2fa', data),
  requestPasswordReset: (data: unknown) =>
    api.post('/auth/request-password-reset', data),
  resetPassword: (data: unknown) =>
    api.post('/auth/reset-password', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data: unknown) =>
    api.put('/auth/profile', data),
  changePassword: (data: unknown) =>
    api.post('/auth/change-password', data),
  toggleTwoFactor: (data: unknown) =>
    api.post('/auth/toggle-2fa', data),
  logout: () => api.post('/auth/logout'),
};

/* ======================================================
   User API
====================================================== */

export const userAPI = {
  getDashboard: () => api.get('/users/dashboard'),
  getAllUsers: (params?: Record<string, any>) =>
    api.get('/users', { params }),
  getUserById: (userId: string) =>
    api.get(`/users/${userId}`),
  updateUserRole: (userId: string, data: unknown) =>
    api.put(`/users/${userId}/role`, data),
  deleteUser: (userId: string) =>
    api.delete(`/users/${userId}`),
  getUserStats: () => api.get('/users/stats'),
};

/* ======================================================
   Payment API
====================================================== */

export const paymentAPI = {
  createPayment: (data: unknown) =>
    api.post('/payments/create', data),
  verifyPayment: (data: unknown) =>
    api.post('/payments/verify', data),
  getUserPayments: (params?: Record<string, any>) =>
    api.get('/payments/my-payments', { params }),
  getPaymentDetails: (paymentId: string) =>
    api.get(`/payments/${paymentId}`),
  downloadInvoice: (invoiceId: string) =>
    api.get(`/payments/invoice/${invoiceId}/download`, {
      responseType: 'blob',
    }),
  refundPayment: (paymentId: string, data: unknown) =>
    api.post(`/payments/${paymentId}/refund`, data),

  markPaymentDisputed: (paymentId: string) =>
    api.patch(`/payments/${paymentId}/dispute`),
};

/* ======================================================
   Admin API
====================================================== */

export const adminAPI = {
  getAnalyticsDashboard: (params?: Record<string, any>) =>
    api.get('/admin/dashboard', { params }),
  getAllPayments: (params?: Record<string, any>) =>
    api.get('/admin/payments', { params }),
  getRevenueByRegion: () =>
    api.get('/admin/revenue/by-region'),
  getTopUsersByRevenue: (params?: Record<string, any>) =>
    api.get('/admin/users/top-by-revenue', { params }),
  getMonthlyRevenue: (params?: Record<string, any>) =>
    api.get('/admin/revenue/monthly', { params }),
  getPaymentAnalytics: (params?: Record<string, any>) =>
    api.get('/admin/payments/analytics', { params }),
  getUserAnalytics: (params?: Record<string, any>) =>
    api.get('/admin/users/analytics', { params }),
  exportData: (params?: Record<string, any>) =>
    api.get('/admin/export', { params }),
};

/* ======================================================
   Utilities
====================================================== */

export const downloadFile = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const formatCurrency = (
  amount: number,
  currency: string = 'INR'
): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
};

export const formatDate = (date: string | number | Date): string => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const createCsv = (
  rows: Array<Record<string, string | number | null | undefined>>
): string => {
  if (!rows.length) return '';

  const headers = Object.keys(rows[0]);
  const escapeValue = (value: string | number | null | undefined) => {
    const normalized = value == null ? '' : String(value);
    return `"${normalized.replace(/"/g, '""')}"`;
  };

  return [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => escapeValue(row[header])).join(',')),
  ].join('\n');
};

export default api;


