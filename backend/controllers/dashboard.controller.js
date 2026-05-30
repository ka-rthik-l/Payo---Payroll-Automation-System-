import { dashboardService } from '../services/dashboard.service.js';

export const dashboardController = {
  async getMetrics(req, res) {
    const data = await dashboardService.getMetrics();
    res.json({ success: true, data });
  }
};
