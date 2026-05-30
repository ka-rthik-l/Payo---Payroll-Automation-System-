import prisma from '../utils/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Persists parsed upload rows so the payroll wizard survives page refresh.
 * One staging record per run per type (employees | salaries).
 */
export const payrollRunStagingService = {
  async saveStaging(runId, type, payload) {
    await assertRunExists(runId);

    return prisma.payrollRunStaging.upsert({
      where: {
        runId_type: { runId, type }
      },
      update: {
        payload,
        updatedAt: new Date()
      },
      create: {
        runId,
        type,
        payload
      }
    });
  },

  async getStaging(runId, type) {
    const staging = await prisma.payrollRunStaging.findUnique({
      where: { runId_type: { runId, type } }
    });
    return staging?.payload ?? null;
  },

  async getAllStaging(runId) {
    const records = await prisma.payrollRunStaging.findMany({
      where: { runId },
      orderBy: { type: 'asc' }
    });

    return {
      employees: records.find((r) => r.type === 'employees')?.payload ?? null,
      salaries: records.find((r) => r.type === 'salaries')?.payload ?? null
    };
  },

  async clearStaging(runId, type = null) {
    if (type) {
      await prisma.payrollRunStaging.deleteMany({ where: { runId, type } });
    } else {
      await prisma.payrollRunStaging.deleteMany({ where: { runId } });
    }
  },

  async resetRunToDraft(runId) {
    await prisma.payrollRun.update({
      where: { id: runId },
      data: { status: 'draft' }
    });
  }
};

async function assertRunExists(runId) {
  const run = await prisma.payrollRun.findUnique({ where: { id: runId } });
  if (!run) {
    throw new AppError(`Payroll run ${runId} not found.`, 404, 'RUN_NOT_FOUND');
  }
  return run;
}
