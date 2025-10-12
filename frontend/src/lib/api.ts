import { authService } from './auth';

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...authService.getAuthHeaders(),
        ...options.headers,
      },
    };

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    return data;
  }

  // Tasks API
  async getTasks(params?: {
    search?: string;
    status?: string;
    priority?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    return this.request(`/api/tasks?${searchParams}`);
  }

  async getTask(id: string) {
    return this.request(`/api/tasks/${id}`);
  }

  async createTask(data: {
    title: string;
    description?: string;
    priority?: string;
    dueDate?: string;
  }) {
    return this.request('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTask(id: string, data: Partial<{
    title: string;
    description: string;
    status: string;
    priority: string;
    dueDate: string;
  }>) {
    return this.request(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTask(id: string) {
    return this.request(`/api/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  // Services API
  async getServices(params?: {
    search?: string;
    category?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    return this.request(`/api/services?${searchParams}`);
  }

  async getService(id: string) {
    return this.request(`/api/services/${id}`);
  }

  async createService(data: {
    name: string;
    category: string;
    description?: string;
  }) {
    return this.request('/api/services', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateService(id: string, data: Partial<{
    name: string;
    category: string;
    description: string;
    status: string;
  }>) {
    return this.request(`/api/services/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteService(id: string) {
    return this.request(`/api/services/${id}`, {
      method: 'DELETE',
    });
  }

  // Referrals API
  async getReferrals(params?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    return this.request(`/api/referrals?${searchParams}`);
  }

  async getReferral(id: string) {
    return this.request(`/api/referrals/${id}`);
  }

  async createReferral(data: {
    patientName: string;
    patientEmail?: string;
    patientPhone?: string;
    referredBy: string;
    notes?: string;
  }) {
    return this.request('/api/referrals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateReferral(id: string, data: Partial<{
    patientName: string;
    patientEmail: string;
    patientPhone: string;
    referredBy: string;
    status: string;
    notes: string;
  }>) {
    return this.request(`/api/referrals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteReferral(id: string) {
    return this.request(`/api/referrals/${id}`, {
      method: 'DELETE',
    });
  }

  // Uploads API
  async getUploads(params?: {
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    return this.request(`/api/uploads?${searchParams}`);
  }

  async uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/api/uploads`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authService.getToken()}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Upload failed');
    }

    return data;
  }

  async deleteUpload(id: string) {
    return this.request(`/api/uploads/${id}`, {
      method: 'DELETE',
    });
  }

  // Audit API
  async getAuditLogs(params?: {
    search?: string;
    action?: string;
    resource?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    return this.request(`/api/audit?${searchParams}`);
  }

  async getAuditStats(params?: {
    startDate?: string;
    endDate?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    return this.request(`/api/audit/stats?${searchParams}`);
  }

  // MailChimp API
  async testMailChimpConnection() {
    return this.request('/api/mailchimp/test');
  }

  async getMailChimpStats() {
    return this.request('/api/mailchimp/stats');
  }

  async sendWellnessCampaign(referralIds: string[]) {
    return this.request('/api/mailchimp/campaigns/wellness', {
      method: 'POST',
      body: JSON.stringify({ referralIds }),
    });
  }

  async sendMedicalCampaign(referralIds: string[]) {
    return this.request('/api/mailchimp/campaigns/medical', {
      method: 'POST',
      body: JSON.stringify({ referralIds }),
    });
  }

  async sendSingleEmail(emailData: {
    email: string;
    name: string;
    type: 'wellness' | 'medical';
    referralCode?: string;
    serviceName?: string;
    providerName?: string;
  }) {
    return this.request('/api/mailchimp/send-single', {
      method: 'POST',
      body: JSON.stringify(emailData),
    });
  }

  async getEmailTemplates() {
    return this.request('/api/mailchimp/templates');
  }

  // User Management API
  async getUsers(params: { page?: number; limit?: number; search?: string } = {}) {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    
    const query = queryParams.toString();
    return this.request(`/api/users${query ? `?${query}` : ''}`);
  }

  async getUser(id: string) {
    return this.request(`/api/users/${id}`);
  }

  async createUser(userData: { email: string; password: string; name?: string; role?: string }) {
    return this.request('/api/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(id: string, userData: { email?: string; name?: string; role?: string; password?: string }) {
    return this.request(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(id: string) {
    return this.request(`/api/users/${id}`, {
      method: 'DELETE',
    });
  }

  async getCurrentUser() {
    return this.request('/api/users/profile/me');
  }

  async updateCurrentUser(userData: { name?: string; email?: string; currentPassword?: string; newPassword?: string }) {
    return this.request('/api/users/profile/me', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  // Settings API
  async getSettings() {
    return this.request('/api/settings/system');
  }

  async updateSettings(settings: any) {
    return this.request('/api/settings/system', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  async testMailChimpConnection(credentials: { apiKey: string; serverPrefix: string }) {
    return this.request('/api/settings/test/mailchimp', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }
}

export const apiService = new ApiService();
