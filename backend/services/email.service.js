import nodemailer from 'nodemailer';
import prisma from '../utils/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { pdfService } from './pdf.service.js';
import { buildPayslipEmailSubject } from './payroll.service.js';

const SIMULATE_FAILURE = process.env.SIMULATE_EMAIL_FAILURE === 'true';
const STALE_SENDING_MS = 5 * 60 * 1000;

export const emailService = {
  async getEmailLogs(status = '') {
    const logs = await prisma.emailLog.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ lastAttemptAt: 'desc' }, { id: 'desc' }]
    });
    return logs.map(formatEmailLog);
  },

  async getEmailMetrics() {
    const [delivered, pending, failed, total] = await Promise.all([
      prisma.emailLog.count({ where: { status: 'delivered' } }),
      prisma.emailLog.count({ where: { status: { in: ['queued', 'sending'] } } }),
      prisma.emailLog.count({ where: { status: 'failed' } }),
      prisma.emailLog.count()
    ]);
    return { delivered, pending, failed, total };
  },

  async processEmailQueue(runId) {
    const run = await prisma.payrollRun.findUnique({ where: { id: runId } });
    if (!run) {
      throw new AppError(`Payroll run ${runId} not found.`, 404, 'RUN_NOT_FOUND');
    }
    if (run.status !== 'completed' && run.status !== 'emails_sent') {
      throw new AppError(
        'Payroll run must be finalized before sending emails.',
        422,
        'RUN_NOT_READY_FOR_EMAIL'
      );
    }

    await recoverStaleSendingLogs(runId);

    const queuedEmails = await prisma.emailLog.findMany({
      where: { runId, status: 'queued' },
      orderBy: { id: 'asc' }
    });

    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    if (!settings) {
      throw new AppError('Settings not found.', 404, 'SETTINGS_NOT_FOUND');
    }

    const transporter = createTransporter(settings);
    let sentCount = 0;
    let failedCount = 0;
    const results = [];

    for (const log of queuedEmails) {
      const result = await sendPayslipEmail(transporter, settings, log, run);
      results.push(result);
      if (result.status === 'delivered') sentCount++;
      if (result.status === 'failed') failedCount++;
    }

    const updatedRun = await prisma.payrollRun.update({
      where: { id: runId },
      data: {
        emailsSent: run.emailsSent + sentCount,
        emailsFailed: run.emailsFailed + failedCount,
        status: 'emails_sent'
      }
    });

    return {
      runId,
      processed: queuedEmails.length,
      sentCount,
      failedCount,
      run: {
        id: updatedRun.id,
        status: updatedRun.status,
        emailsSent: updatedRun.emailsSent,
        emailsFailed: updatedRun.emailsFailed
      },
      results
    };
  },

  async retryFailedEmails(runId = '') {
    const failedEmails = await prisma.emailLog.findMany({
      where: {
        status: 'failed',
        ...(runId ? { runId } : {})
      },
      orderBy: { id: 'asc' }
    });

    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    if (!settings) {
      throw new AppError('Settings not found.', 404, 'SETTINGS_NOT_FOUND');
    }

    const transporter = createTransporter(settings);
    let retriedSuccess = 0;
    let retriedFail = 0;
    const results = [];

    for (const log of failedEmails) {
      const run = await prisma.payrollRun.findUnique({ where: { id: log.runId } });
      if (!run) continue;

      const result = await sendPayslipEmail(transporter, settings, log, run, { isRetry: true });
      results.push(result);
      if (result.status === 'delivered') {
        retriedSuccess++;
        await adjustRunEmailCounters(log.runId, 1, -1);
      } else {
        retriedFail++;
      }
    }

    return { retriedSuccess, retriedFail, results };
  },

  async retryEmailById(emailLogId) {
    const log = await prisma.emailLog.findUnique({ where: { id: emailLogId } });
    if (!log) {
      throw new AppError(`Email log ${emailLogId} not found.`, 404, 'EMAIL_LOG_NOT_FOUND');
    }
    if (log.status !== 'failed') {
      throw new AppError('Only failed emails can be retried.', 422, 'EMAIL_NOT_FAILED');
    }

    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    if (!settings) {
      throw new AppError('Settings not found.', 404, 'SETTINGS_NOT_FOUND');
    }

    const run = await prisma.payrollRun.findUnique({ where: { id: log.runId } });
    if (!run) {
      throw new AppError(`Payroll run ${log.runId} not found.`, 404, 'RUN_NOT_FOUND');
    }

    const transporter = createTransporter(settings);
    const result = await sendPayslipEmail(transporter, settings, log, run, { isRetry: true });

    if (result.status === 'delivered') {
      await adjustRunEmailCounters(log.runId, 1, -1);
    }

    return result;
  },

  async testConnection() {
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    if (!settings) {
      throw new AppError('Settings not found.', 404, 'SETTINGS_NOT_FOUND');
    }

    const transporter = createTransporter(settings);

    if (typeof transporter.verify !== 'function') {
      return { success: false, message: 'transporter.verify is not a function (likely a mock transporter in dev)' };
    }

    try {
      await transporter.verify();
      return { success: true };
    } catch (err) {
      return { success: false, code: err.code, message: err.message };
    }
  }
};

async function recoverStaleSendingLogs(runId) {
  const cutoff = new Date(Date.now() - STALE_SENDING_MS);
  await prisma.emailLog.updateMany({
    where: {
      runId,
      status: 'sending',
      lastAttemptAt: { lt: cutoff }
    },
    data: {
      status: 'failed',
      errorMessage: 'Send interrupted. Please retry this email.'
    }
  });
}

async function sendPayslipEmail(transporter, settings, log, run, { isRetry = false } = {}) {
  const attempts = log.attempts + 1;
  const now = new Date();
  const subject = buildPayslipEmailSubject(run.month, run.year);

  await prisma.emailLog.update({
    where: { id: log.id },
    data: {
      status: 'sending',
      attempts,
      lastAttemptAt: now,
      subject,
      errorMessage: null
    }
  });

  try {
    if (shouldSimulateFailure(log, attempts)) {
      throw new Error('SMTP Connection Timeout: Failed to deliver payslip.');
    }

    const payslip = await pdfService.findPayslipForEmail(log.runId, log.employeeId);
    if (!payslip) {
      throw new Error(`Payslip not found for employee ${log.employeeId}.`);
    }

    const { buffer, filename } = await pdfService.generatePayslipPdfBuffer(payslip.id);

    console.log('Calling sendMail...', {
      from: settings.emailSender,
      to: log.recipient,
      subject,
      host: transporter.options?.host || process.env.SMTP_HOST || settings.smtpHost,
      port: transporter.options?.port || Number(process.env.SMTP_PORT || settings.smtpPort || 587)
    });

    await transporter.sendMail({
      from: settings.emailSender,
      to: log.recipient,
      subject,
      text: buildEmailBody(log.employeeName, run.month, run.year),
      html: buildEmailHtmlBody(log.employeeName, run.month, run.year),
      attachments: [
        {
          filename,
          content: buffer,
          contentType: 'application/pdf'
        }
      ]
    });

    console.log('Email success:', log.recipient);

    const delivered = await prisma.emailLog.update({
      where: { id: log.id },
      data: {
        status: 'delivered',
        lastAttemptAt: new Date(),
        errorMessage: null
      }
    });

    return formatEmailLog(delivered);
  } catch (err) {
    console.error('Email failure:', err);
    const failed = await prisma.emailLog.update({
      where: { id: log.id },
      data: {
        status: 'failed',
        lastAttemptAt: new Date(),
        errorMessage: err.message
      }
    });

    return formatEmailLog(failed);
  }
}

function createTransporter(settings) {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const host = process.env.SMTP_HOST || settings.smtpHost;
  const port = Number(process.env.SMTP_PORT || settings.smtpPort || 587);
  const secure = process.env.SMTP_SECURE === 'true';
  const isProduction = process.env.NODE_ENV === 'production';

  console.log('--- SMTP CONFIG DIAGNOSTICS ---');
  console.log('SMTP HOST:', host);
  console.log('SMTP PORT:', port);
  console.log('SMTP SECURE:', secure);
  console.log('SMTP USER EXISTS:', !!user);
  console.log('SMTP PASS EXISTS:', !!pass);
  console.log('Creating transporter...');

  if (user && pass) {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass }
    });

    console.log('Transporter options after createTransport():', JSON.stringify(transporter.options, null, 2));

    if (typeof transporter.verify === 'function') {
      console.log('Transporter verify exists.');
    } else {
      console.log('Transporter verify does not exist.');
    }

    return transporter;
  }

  if (isProduction) {
    throw new AppError(
      'SMTP is not configured. Set SMTP_USER and SMTP_PASS environment variables.',
      503,
      'SMTP_NOT_CONFIGURED'
    );
  }

  return {
    sendMail: async (options) => {
      console.log(`[DEV EMAIL] To: ${options.to} | Subject: ${options.subject} | Attachments: ${options.attachments?.length || 0}`);
      return { messageId: `dev-${Date.now()}` };
    }
  };
}

function shouldSimulateFailure(log, attempts) {
  if (!SIMULATE_FAILURE) return false;
  if (attempts > 1) return false;
  return log.employeeId === 'EMP004' || log.employeeName.includes('Jenny');
}

function buildEmailBody(employeeName, month, year) {
  return [
    `Dear ${employeeName},`,
    '',
    `Your salary slip for the payroll period ${month} ${year} has been processed.`,
    '',
    'Please find your payslip attached to this email.',
    '',
    'If you have any questions, contact your HR department.',
    '',
    'Regards,',
    'Payo Payroll Team'
  ].join('\n');
}

function buildEmailHtmlBody(employeeName, month, year) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Salary Slip - ${month} ${year}</title>
</head>
<body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; -ms-text-size-adjust: 100%; width: 100% !important;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 24px 0;">
    <tr>
      <td align="center">
        <!-- Card Container -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);">
          
          <!-- Header (Brand/Dark Slate Banner) -->
          <tr>
            <td style="background-color: #0f172a; padding: 32px 24px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">Payo Payroll</h1>
              <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 14px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">Automated Salary Slip Dispatcher</p>
            </td>
          </tr>
          
          <!-- Content Body -->
          <tr>
            <td style="padding: 32px 24px; color: #334155;">
              <h2 style="font-size: 18px; font-weight: 600; margin-top: 0; margin-bottom: 16px; color: #0f172a; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">Dear ${employeeName},</h2>
              
              <p style="font-size: 15px; line-height: 24px; margin-top: 0; margin-bottom: 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                Your salary slip for the payroll period <strong style="color: #0f172a;">${month} ${year}</strong> has been successfully processed and is now available.
              </p>
              
              <!-- Attachment Box -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; vertical-align: middle;">
                    <span style="font-size: 24px; vertical-align: middle; margin-right: 8px; line-height: 1;">📎</span>
                    <span style="display: inline-block; vertical-align: middle;">
                      <strong style="color: #0f172a; display: block; margin-bottom: 2px;">Payslip Attachment</strong>
                      <span style="font-size: 12px; color: #64748b; display: block;">PDF format, ready to print or download</span>
                    </span>
                  </td>
                </tr>
              </table>
              
              <p style="font-size: 14px; line-height: 22px; margin-top: 0; margin-bottom: 20px; color: #64748b; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                Please find the generated payslip PDF file attached to this email. We recommend downloading and keeping a copy for your personal records.
              </p>
              
              <p style="font-size: 14px; line-height: 22px; margin-top: 0; margin-bottom: 24px; color: #64748b; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                If you have any questions regarding your calculations, deductions, or have noticed any discrepancy, please contact the HR department.
              </p>
              
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-top: 24px; margin-bottom: 24px;">
              
              <!-- Sign off -->
              <p style="font-size: 14px; line-height: 20px; margin: 0; color: #475569; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                Best regards,<br>
                <strong style="color: #0f172a;">Payo Payroll Team</strong>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 20px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
              This is an automated system email. Please do not reply directly to this message.
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function adjustRunEmailCounters(runId, sentDelta, failedDelta) {
  await prisma.payrollRun.update({
    where: { id: runId },
    data: {
      emailsSent: { increment: sentDelta },
      emailsFailed: { increment: failedDelta }
    }
  });
}

function formatEmailLog(log) {
  return {
    id: log.id,
    runId: log.runId,
    employeeId: log.employeeId,
    employeeName: log.employeeName,
    recipient: log.recipient,
    subject: log.subject,
    status: log.status,
    attempts: log.attempts,
    timestamp: log.lastAttemptAt
      ? formatTimestamp(log.lastAttemptAt)
      : null,
    lastAttemptAt: log.lastAttemptAt ? log.lastAttemptAt.toISOString() : null,
    errorMessage: log.errorMessage
  };
}

function formatTimestamp(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
