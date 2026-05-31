import { settingsService } from '../services/settings.service.js';
import { AppError } from '../middleware/errorHandler.js';

export const settingsController = {
  async getSettings(req, res) {
    const settings = await settingsService.getSettings();
    res.json({ success: true, data: settings });
  },

  async updateCompany(req, res) {
    const { companyName, address, taxId } = req.body;
    if (!companyName || !address || !taxId) {
      throw new AppError('companyName, address, and taxId are required.', 400, 'VALIDATION_ERROR');
    }
    const settings = await settingsService.updateCompany({ companyName, address, taxId });
    res.json({ success: true, data: settings });
  },

  async updateCalendar(req, res) {
    const { currency, activePeriodMonth, activePeriodYear } = req.body;
    if (!currency || !activePeriodMonth || !activePeriodYear) {
      throw new AppError('currency, activePeriodMonth, and activePeriodYear are required.', 400, 'VALIDATION_ERROR');
    }
    if (!['USD', 'INR'].includes(currency)) {
      throw new AppError('currency must be USD or INR.', 400, 'VALIDATION_ERROR');
    }
    const settings = await settingsService.updateCalendar({ currency, activePeriodMonth, activePeriodYear });
    res.json({ success: true, data: settings });
  }
};
