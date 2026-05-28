import { apiClient } from './client';

export const adminApi = {
  getSettings: () =>
    apiClient.get<{ settings: Record<string, string> }>('/admin/settings'),

  updateSetting: (key: string, value: string) =>
    apiClient.put<{ settings: Record<string, string> }>('/admin/settings', { key, value }),
};
