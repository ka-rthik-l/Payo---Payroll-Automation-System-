import { emailService } from '../services/email.service.js';

export const emailsController = {
  async list(req, res) {
    const { status = '' } = req.query;
    const data = await emailService.getEmailLogs(status);
    res.json({ success: true, data });
  },

  async metrics(req, res) {
    const data = await emailService.getEmailMetrics();
    res.json({ success: true, data });
  },

  async retryAll(req, res) {
    const { runId = '' } = req.body || {};
    const data = await emailService.retryFailedEmails(runId);
    res.json({ success: true, data });
  },

  async retryOne(req, res) {
    const data = await emailService.retryEmailById(req.params.id);
    res.json({ success: true, data });
  },

  async testConnection(req, res) {
    const result = await emailService.testConnection();
    if (result.success) {
      return res.json({ success: true });
    } else {
      return res.json({
        success: false,
        code: result.code,
        message: result.message
      });
    }
  }
};
