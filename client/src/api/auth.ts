import { apiClient } from './client';

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  language?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export const authApi = {
  register: (data: RegisterData) => apiClient.post('/auth/register', data),
  login: (data: LoginData) => apiClient.post<{ token: string; user: object }>('/auth/login', data),
};
