import { apiClient } from './apiClient.js';

let settingsCache = null;

export const settingsService = {
  async getSettings() {
    if (settingsCache) return settingsCache;
    const res = await apiClient.get('/settings');
    settingsCache = res.data;
    return settingsCache;
  },

  async updateCompany(data) {
    const res = await apiClient.patch('/settings/company', data);
    settingsCache = res.data;
    return settingsCache;
  },

  async updateCalendar(data) {
    const res = await apiClient.patch('/settings/calendar', data);
    settingsCache = res.data;
    return settingsCache;
  }
};
