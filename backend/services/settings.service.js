import prisma from '../utils/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export const settingsService = {
  async getSettings() {
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    if (!settings) {
      throw new AppError('Settings not found. Run database seed.', 404, 'SETTINGS_NOT_FOUND');
    }
    return formatSettings(settings);
  },

  async updateCompany(data) {
    const settings = await prisma.settings.update({
      where: { id: 1 },
      data: {
        companyName: data.companyName,
        address: data.address,
        taxId: data.taxId
      }
    });
    return formatSettings(settings);
  },

  async updateCalendar(data) {
    const settings = await prisma.settings.update({
      where: { id: 1 },
      data: {
        currency: data.currency,
        activePeriodMonth: data.activePeriodMonth,
        activePeriodYear: data.activePeriodYear
      }
    });
    return formatSettings(settings);
  }
};

function formatSettings(settings) {
  return {
    companyName: settings.companyName,
    address: settings.address,
    taxId: settings.taxId,
    emailSender: settings.emailSender,
    currency: settings.currency,
    activePeriodMonth: settings.activePeriodMonth,
    activePeriodYear: settings.activePeriodYear
  };
}
