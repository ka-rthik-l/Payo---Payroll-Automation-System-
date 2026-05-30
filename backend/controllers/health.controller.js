import { healthService } from '../services/health.service.js';

export const healthController = {
  async getHealth(req, res) {
    const result = await healthService.check();
    const statusCode = result.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(result);
  }
};
