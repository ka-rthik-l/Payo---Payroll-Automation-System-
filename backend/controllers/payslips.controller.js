import { pdfService } from '../services/pdf.service.js';

export const payslipsController = {
  async list(req, res) {
    const { search = '', month = '', year = '' } = req.query;
    const data = await pdfService.getAllPayslips(search, month, year);
    res.json({ success: true, data });
  },

  async getById(req, res) {
    const data = await pdfService.getPayslipById(req.params.id);
    res.json({ success: true, data });
  },

  async getPdfData(req, res) {
    const data = await pdfService.getPayslipPdfData(req.params.id);
    res.json({ success: true, data });
  },

  async downloadPdf(req, res) {
    const { buffer, filename } = await pdfService.generatePayslipPdfBuffer(req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
};
