import { apiClient } from './apiClient.js';

export const dashboardService = {
  async getMetrics() {
    const res = await apiClient.get('/dashboard/metrics');
    return res.data;
  }
};
