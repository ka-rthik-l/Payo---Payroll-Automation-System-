import prisma from '../utils/prisma.js';
import { settingsService } from './settings.service.js';

const FINALIZED_STATUSES = new Set(['completed', 'emails_sent']);

export const dashboardService = {
  async getMetrics() {
    const settings = await settingsService.getSettings();
    const [employeeCount, runs, emails] = await Promise.all([
      prisma.employee.count(),
      prisma.payrollRun.findMany(),
      prisma.emailLog.findMany({ select: { status: true } })
    ]);

    const finalizedRuns = runs.filter((run) => FINALIZED_STATUSES.has(run.status));

    finalizedRuns.sort((a, b) => {
      const dateA = a.dateProcessed || a.createdAt;
      const dateB = b.dateProcessed || b.createdAt;
      return dateB.getTime() - dateA.getTime();
    });

    const totalPayrollPaid = finalizedRuns.reduce(
      (sum, run) => sum + Number(run.totalNet || 0),
      0
    );

    const terminalEmails = emails.filter(
      (e) => e.status === 'delivered' || e.status === 'failed'
    );
    const deliveredCount = terminalEmails.filter((e) => e.status === 'delivered').length;
    const emailSuccessRate = terminalEmails.length > 0
      ? Math.round((deliveredCount / terminalEmails.length) * 100)
      : 0;

    const isActivePeriodComplete = runs.some(
      (run) =>
        run.month === settings.activePeriodMonth &&
        run.year === settings.activePeriodYear &&
        FINALIZED_STATUSES.has(run.status)
    );

    const lastRun = finalizedRuns[0] || null;

    return {
      activeEmployeesCount: employeeCount,
      totalPayrollPaid,
      emailSuccessRate,
      totalEmailCount: emails.length,
      deliveredCount,
      runsCount: finalizedRuns.length,
      lastRun: lastRun
        ? {
            id: lastRun.id,
            month: lastRun.month,
            year: lastRun.year,
            status: lastRun.status,
            dateProcessed: lastRun.dateProcessed
              ? lastRun.dateProcessed.toISOString().split('T')[0]
              : null,
            employeesCount: lastRun.employeesCount,
            totalGross: Number(lastRun.totalGross),
            totalDeductions: Number(lastRun.totalDeductions),
            totalNet: Number(lastRun.totalNet),
            emailsSent: lastRun.emailsSent,
            emailsFailed: lastRun.emailsFailed
          }
        : null,
      activePeriod: {
        month: settings.activePeriodMonth,
        year: settings.activePeriodYear
      },
      isActivePeriodComplete,
      currency: settings.currency
    };
  }
};
