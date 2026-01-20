import axios, { AxiosError } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string }>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  getMe: () => api.get('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
};

// Users API
export const usersApi = {
  getAll: () => api.get('/users'),
  create: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};

// Vendors API
export const vendorsApi = {
  getAll: (params?: { status?: string; search?: string }) =>
    api.get('/vendors', { params }),
  getOne: (id: string) => api.get(`/vendors/${id}`),
  create: (data: any) => api.post('/vendors', data),
  update: (id: string, data: any) => api.put(`/vendors/${id}`, data),
  delete: (id: string) => api.delete(`/vendors/${id}`),
};

// Vendor Services API
export const vendorServicesApi = {
  getAll: (params?: { vendorId?: string; type?: string }) =>
    api.get('/vendor-services', { params }),
  getOne: (id: string) => api.get(`/vendor-services/${id}`),
  create: (data: any) => api.post('/vendor-services', data),
  update: (id: string, data: any) => api.put(`/vendor-services/${id}`, data),
  delete: (id: string) => api.delete(`/vendor-services/${id}`),
  import: (vendorId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/vendor-services/import/${vendorId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Clients API
export const clientsApi = {
  getAll: (params?: { search?: string; isActive?: boolean }) =>
    api.get('/clients', { params }),
  getOne: (id: string) => api.get(`/clients/${id}`),
  create: (data: any) => api.post('/clients', data),
  update: (id: string, data: any) => api.put(`/clients/${id}`, data),
  delete: (id: string) => api.delete(`/clients/${id}`),
};

// Orders API
export const ordersApi = {
  getAll: (params?: {
    status?: string;
    clientId?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) => api.get('/orders', { params }),
  getOne: (id: string) => api.get(`/orders/${id}`),
  create: (data: any) => api.post('/orders', data),
  update: (id: string, data: any) => api.put(`/orders/${id}`, data),
  updateStatus: (id: string, status: string) =>
    api.patch(`/orders/${id}/status`, { status }),
  delete: (id: string) => api.delete(`/orders/${id}`),
  recalculate: (id: string) => api.post(`/orders/${id}/recalculate`),
};

// Cost Operations API
export const costOperationsApi = {
  getByOrder: (orderId: string) => api.get(`/cost-operations/order/${orderId}`),
  create: (data: any) => api.post('/cost-operations', data),
  update: (id: string, data: any) => api.put(`/cost-operations/${id}`, data),
  delete: (id: string) => api.delete(`/cost-operations/${id}`),
};

// Income Operations API
export const incomeOperationsApi = {
  getByOrder: (orderId: string) =>
    api.get(`/income-operations/order/${orderId}`),
  create: (data: any) => api.post('/income-operations', data),
  recordPayment: (id: string, data: any) =>
    api.post(`/income-operations/${id}/payment`, data),
  update: (id: string, data: any) => api.put(`/income-operations/${id}`, data),
  delete: (id: string) => api.delete(`/income-operations/${id}`),
};

// Accounts API
export const accountsApi = {
  getAll: (params?: { type?: string }) => api.get('/accounts', { params }),
  getOne: (id: string) => api.get(`/accounts/${id}`),
  getBalanceSheet: (id: string, params?: { dateFrom?: string; dateTo?: string }) =>
    api.get(`/accounts/${id}/balance-sheet`, { params }),
  create: (data: any) => api.post('/accounts', data),
  update: (id: string, data: any) => api.put(`/accounts/${id}`, data),
};

// Transactions API
export const transactionsApi = {
  getAll: (params?: {
    accountId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) => api.get('/transactions', { params }),
  create: (data: any) => api.post('/transactions', data),
  reverse: (id: string, description?: string) =>
    api.post(`/transactions/${id}/reverse`, { description }),
};

// Dashboard API
export const dashboardApi = {
  getKPI: (period?: string) => api.get('/dashboard/kpi', { params: { period } }),
  getRevenueChart: (period?: string, groupBy?: string) =>
    api.get('/dashboard/chart/revenue', { params: { period, groupBy } }),
  getCostsChart: (period?: string) =>
    api.get('/dashboard/chart/costs', { params: { period } }),
  getTopClients: (period?: string, limit?: number) =>
    api.get('/dashboard/top-clients', { params: { period, limit } }),
  getOrdersByStatus: () => api.get('/dashboard/orders-by-status'),
};

// Reports API
export const reportsApi = {
  getOrders: (params?: {
    dateFrom?: string;
    dateTo?: string;
    clientId?: string;
    status?: string;
    format?: 'json' | 'xlsx' | 'csv';
  }) => api.get('/reports/orders', { params, responseType: params?.format && params.format !== 'json' ? 'blob' : 'json' }),
  getOrderPNL: (id: string) => api.get(`/reports/order/${id}/pnl`),
  getVendors: (params?: { dateFrom?: string; dateTo?: string }) =>
    api.get('/reports/vendors', { params }),
  getClients: (params?: {
    dateFrom?: string;
    dateTo?: string;
    format?: 'json' | 'xlsx' | 'csv';
  }) => api.get('/reports/clients', { params, responseType: params?.format && params.format !== 'json' ? 'blob' : 'json' }),
};

// Order Expenses API
export const orderExpensesApi = {
  // Категории расходов
  getCategories: () => api.get('/order-expenses/categories'),
  
  // Расходы заказа
  getByOrder: (orderId: string) => api.get(`/order-expenses/order/${orderId}`),
  create: (orderId: string, data: any) => api.post(`/order-expenses/order/${orderId}`, data),
  update: (id: string, data: any) => api.put(`/order-expenses/${id}`, data),
  delete: (id: string) => api.delete(`/order-expenses/${id}`),
  
  // Массовые операции
  bulkCreate: (orderId: string, expenses: any[]) => 
    api.post(`/order-expenses/order/${orderId}/bulk`, { expenses }),
  cloneFromOrder: (orderId: string, sourceOrderId: string) =>
    api.post(`/order-expenses/order/${orderId}/clone/${sourceOrderId}`),
  
  // Шаблоны
  getTemplates: () => api.get('/order-expenses/templates'),
  applyTemplate: (orderId: string, templateId: string) =>
    api.post(`/order-expenses/order/${orderId}/apply-template/${templateId}`),
  
  // Анализ изменений цен
  checkPriceChanges: (orderId: string) =>
    api.get(`/order-expenses/order/${orderId}/price-changes`),
};
