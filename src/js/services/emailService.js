import { apiClient } from './apiClient.js';

export const emailService = {
  async getEmailLogs(status = '') {
    const res = await apiClient.get('/emails', {
      query: status ? { status } : {}
    });
    return res.data;
  },

  async getEmailMetrics() {
    const res = await apiClient.get('/emails/metrics');
    return res.data;
  },

  async processEmailQueue(runId, onLogUpdate) {
    const res = await apiClient.post(`/payroll/runs/${runId}/emails/send`);
    const data = res.data;

    for (const log of data.results || []) {
      if (onLogUpdate) {
        onLogUpdate(
          log,
          `Connecting to SMTP Server... Sending mail to ${log.recipient}`,
          'system'
        );
      }

      if (!onLogUpdate) continue;

      if (log.status === 'delivered') {
        onLogUpdate(
          log,
          `[SUCCESS] Payslip successfully delivered to ${log.recipient}`,
          'success'
        );
      } else if (log.status === 'failed') {
        onLogUpdate(
          log,
          `[ERROR] ${log.errorMessage || 'Failed to deliver payslip.'}`,
          'error'
        );
      } else {
        onLogUpdate(
          log,
          `Connecting to SMTP Server... Sending mail to ${log.recipient}`,
          'system'
        );
      }
    }

    return {
      sentCount: data.sentCount,
      failedCount: data.failedCount,
      processed: data.processed,
      run: data.run
    };
  },

  async retryFailedEmails(runId = '') {
    const res = await apiClient.post('/emails/retry', runId ? { runId } : {});
    return res.data;
  },

  async retryEmailById(emailLogId) {
    const res = await apiClient.post(`/emails/${emailLogId}/retry`);
    return res.data;
  }
};
