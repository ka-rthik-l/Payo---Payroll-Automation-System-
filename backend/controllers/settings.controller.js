import { settingsService } from '../services/settings.service.js';
import { AppError } from '../middleware/errorHandler.js';

export const settingsController = {
  async getSettings(req, res) {
    const settings = await settingsService.getSettings();
    res.json({ success: true, data: settings });
  },

  async updateCompany(req, res) {
    const { companyName, address, taxId, emailSender, smtpServer, smtpPort } = req.body;
    if (!companyName || !address || !taxId || !emailSender || !smtpServer) {
      throw new AppError('companyName, address, taxId, emailSender, and smtpServer are required.', 400, 'VALIDATION_ERROR');
    }
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(emailSender)) {
      throw new AppError('emailSender must be a valid email address.', 400, 'VALIDATION_ERROR');
    }
    const parsedPort = Number(smtpPort);
    if (isNaN(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
      throw new AppError('smtpPort must be a valid number between 1 and 65535.', 400, 'VALIDATION_ERROR');
    }
    const settings = await settingsService.updateCompany({ companyName, address, taxId, emailSender, smtpServer, smtpPort: parsedPort });
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
