import { apiClient } from './apiClient.js';

export const settingsService = {
  async getSettings() {
    const res = await apiClient.get('/settings');
    return res.data;
  },

  async updateCompany(data) {
    const res = await apiClient.patch('/settings/company', data);
    return res.data;
  },

  async updateCalendar(data) {
    const res = await apiClient.patch('/settings/calendar', data);
    return res.data;
  }
};
