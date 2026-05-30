import { payrollRunService } from '../services/payrollRun.service.js';
import { emailService } from '../services/email.service.js';
import { getOperator } from '../utils/operator.js';

export const payrollController = {
  async getOrCreateCurrentRun(req, res) {
    const data = await payrollRunService.getOrCreateCurrentRun();
    res.status(200).json({ success: true, data });
  },

  async getRunById(req, res) {
    const data = await payrollRunService.getRunById(req.params.id);
    res.json({ success: true, data });
  },

  async deleteRun(req, res) {
    const data = await payrollRunService.deleteRun(req.params.id);
    res.json({ success: true, data });
  },

  async uploadEmployees(req, res) {
    const data = await payrollRunService.uploadEmployees(
      req.params.id,
      req.file,
      getOperator(req)
    );
    res.status(200).json({ success: true, data });
  },

  async uploadSalaries(req, res) {
    const data = await payrollRunService.uploadSalaries(
      req.params.id,
      req.file,
      getOperator(req)
    );
    res.status(200).json({ success: true, data });
  },

  async validateRun(req, res) {
    const data = await payrollRunService.validateRun(req.params.id);
    res.json({ success: true, data });
  },

  async calculateRun(req, res) {
    const data = await payrollRunService.calculateRun(req.params.id);
    res.json({ success: true, data });
  },

  async listRuns(req, res) {
    const data = await payrollRunService.listRuns();
    res.json({ success: true, data });
  },

  async finalizeRun(req, res) {
    const data = await payrollRunService.finalizeRun(req.params.id, getOperator(req));
    res.json({ success: true, data });
  },

  async sendEmails(req, res) {
    const data = await emailService.processEmailQueue(req.params.id);
    res.json({ success: true, data });
  },

  async resetStaging(req, res) {
    const data = await payrollRunService.resetStaging(req.params.id);
    res.json({ success: true, data });
  }
};
