import prisma from '../utils/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { generateRunId } from '../utils/idGenerator.js';
import { settingsService } from './settings.service.js';
import { payrollRunStagingService } from './payrollRunStaging.service.js';
import { payrollService } from './payroll.service.js';
import { parseFile } from './fileParser.service.js';

const FINALIZED_STATUSES = new Set(['completed', 'emails_sent']);

export const payrollRunService = {
  async getOrCreateCurrentRun() {
    const settings = await settingsService.getSettings();
    const { activePeriodMonth: month, activePeriodYear: year } = settings;

    const existing = await prisma.payrollRun.findUnique({
      where: { month_year: { month, year } }
    });

    if (existing) {
      if (FINALIZED_STATUSES.has(existing.status)) {
        throw new AppError(
          `Payroll for ${month} ${year} has already been finalized.`,
          409,
          'RUN_ALREADY_FINALIZED'
        );
      }
      return buildRunResponse(existing.id);
    }

    const run = await prisma.payrollRun.create({
      data: {
        id: generateRunId(month, year),
        month,
        year,
        status: 'draft'
      }
    });

    return buildRunResponse(run.id);
  },

  async getRunById(runId) {
    const run = await prisma.payrollRun.findUnique({ where: { id: runId } });
    if (!run) {
      throw new AppError(`Payroll run ${runId} not found.`, 404, 'RUN_NOT_FOUND');
    }
    return buildRunResponse(runId);
  },

  async uploadEmployees(runId, file, uploadedBy) {
    return processUpload(runId, file, uploadedBy, 'employees');
  },

  async uploadSalaries(runId, file, uploadedBy) {
    return processUpload(runId, file, uploadedBy, 'salaries');
  },

  async validateRun(runId) {
    const run = await assertRunCanProcess(runId);
    const { employees, salaries } = await loadStagingData(runId);

    const report = payrollService.validateRunData(employees, salaries);
    const passed = !payrollService.hasValidationErrors(report);

    if (passed) {
      await prisma.payrollRun.update({
        where: { id: runId },
        data: { status: 'validated' }
      });
    } else if (run.status === 'validated') {
      await payrollRunStagingService.resetRunToDraft(runId);
    }

    const updatedRun = await prisma.payrollRun.findUnique({ where: { id: runId } });

    return {
      report,
      passed,
      run: formatRun(updatedRun)
    };
  },

  async calculateRun(runId) {
    const run = await assertRunCanProcess(runId);

    if (run.status !== 'validated') {
      throw new AppError(
        'Payroll run must be validated before calculation preview.',
        422,
        'RUN_NOT_VALIDATED'
      );
    }

    const { employees, salaries } = await loadStagingData(runId);
    const payroll = payrollService.calculatePayroll(employees, salaries);
    const totals = payrollService.summarizePayroll(payroll);

    return {
      payroll,
      totals,
      run: formatRun(run)
    };
  },

  async listRuns() {
    const runs = await payrollService.listPayrollRuns(prisma);
    return runs.map(formatRun);
  },

  async deleteRun(runId) {
    const run = await prisma.payrollRun.findUnique({ where: { id: runId } });
    if (!run) {
      throw new AppError(`Payroll run ${runId} not found.`, 404, 'RUN_NOT_FOUND');
    }

    await prisma.$transaction(async (tx) => {
      // Delete dependent child records first to preserve referential integrity.
      await tx.emailLog.deleteMany({ where: { runId } });
      await tx.payslip.deleteMany({ where: { runId } });
      await tx.payrollRunStaging.deleteMany({ where: { runId } });
      // UploadFile uses onDelete: SetNull, so remove any uploads explicitly for this run.
      await tx.uploadFile.deleteMany({ where: { runId } });
      await tx.payrollRun.delete({ where: { id: runId } });
    });

    return { id: runId };
  },

  async finalizeRun(runId, generatedBy) {
    const run = await prisma.payrollRun.findUnique({ where: { id: runId } });

    if (!run) {
      throw new AppError(`Payroll run ${runId} not found.`, 404, 'RUN_NOT_FOUND');
    }

    if (FINALIZED_STATUSES.has(run.status)) {
      throw new AppError(
        `Payroll for ${run.month} ${run.year} (ID: ${run.id}) has already been finalized and processed.`,
        409,
        'RUN_ALREADY_FINALIZED'
      );
    }

    if (run.status !== 'validated') {
      throw new AppError(
        'Payroll run must be validated before finalization.',
        422,
        'RUN_NOT_VALIDATED'
      );
    }

    const duplicateFinalized = await prisma.payrollRun.findFirst({
      where: {
        month: run.month,
        year: run.year,
        status: { in: ['completed', 'emails_sent'] },
        NOT: { id: runId }
      }
    });

    if (duplicateFinalized) {
      throw new AppError(
        `Payroll for ${run.month} ${run.year} has already been finalized.`,
        409,
        'DUPLICATE_FINALIZED_PERIOD'
      );
    }

    const { employees, salaries } = await loadStagingData(runId);

    const report = payrollService.validateRunData(employees, salaries);
    if (payrollService.hasValidationErrors(report)) {
      throw new AppError(
        'Payroll run failed validation. Re-validate before finalizing.',
        422,
        'VALIDATION_FAILED'
      );
    }

    const result = await prisma.$transaction((tx) =>
      payrollService.finalizeRun(tx, { run, employees, salaries, generatedBy })
    );

    return {
      run: formatRun(result.run),
      payslipsCreated: result.payslipsCreated,
      emailsQueued: result.emailsQueued
    };
  },

  async resetStaging(runId) {
    await assertRunCanProcess(runId);

    await prisma.payrollRunStaging.deleteMany({ where: { runId } });
    await prisma.payrollRun.update({
      where: { id: runId },
      data: {
        status: 'draft',
        employeeUploadId: null,
        salaryUploadId: null
      }
    });

    return buildRunResponse(runId);
  }
};

async function loadStagingData(runId) {
  const staging = await payrollRunStagingService.getAllStaging(runId);

  const employees = Array.isArray(staging.employees) ? staging.employees : null;
  const salaries = Array.isArray(staging.salaries) ? staging.salaries : null;

  if (!employees || employees.length === 0) {
    throw new AppError(
      'Employee upload data is missing. Upload employees before continuing.',
      422,
      'STAGING_EMPLOYEES_MISSING'
    );
  }

  if (!salaries || salaries.length === 0) {
    throw new AppError(
      'Salary upload data is missing. Upload salaries before continuing.',
      422,
      'STAGING_SALARIES_MISSING'
    );
  }

  return { employees, salaries };
}

async function processUpload(runId, file, uploadedBy, type) {
  if (!file) {
    throw new AppError('No file uploaded. Use multipart field name "file".', 400, 'NO_FILE');
  }

  const run = await assertRunEditable(runId);

  let rows;
  try {
    rows = await parseFile(file.path, file.originalname);
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(`Failed to parse file: ${err.message}`, 400, 'PARSE_ERROR');
  }

  if (rows.length === 0) {
    throw new AppError(
      `No records found in ${type} data.`,
      400,
      'EMPTY_FILE'
    );
  }

  const uploadRecord = await prisma.uploadFile.create({
    data: {
      type,
      originalName: file.originalname,
      mimeType: file.mimetype,
      storagePath: file.path,
      rowCount: rows.length,
      runId,
      uploadedBy: uploadedBy || 'system'
    }
  });

  await payrollRunStagingService.saveStaging(runId, type, rows);

  if (run.status === 'validated') {
    await payrollRunStagingService.resetRunToDraft(runId);
  }

  const uploadField = type === 'employees' ? 'employeeUploadId' : 'salaryUploadId';
  await prisma.payrollRun.update({
    where: { id: runId },
    data: { [uploadField]: uploadRecord.id }
  });

  const response = await buildRunResponse(runId);

  return {
    ...response,
    upload: formatUpload(uploadRecord),
    rowCount: rows.length
  };
}

async function buildRunResponse(runId) {
  const run = await prisma.payrollRun.findUnique({ where: { id: runId } });
  if (!run) {
    throw new AppError(`Payroll run ${runId} not found.`, 404, 'RUN_NOT_FOUND');
  }

  const staging = await payrollRunStagingService.getAllStaging(runId);

  const [employeeUpload, salaryUpload] = await Promise.all([
    run.employeeUploadId
      ? prisma.uploadFile.findUnique({ where: { id: run.employeeUploadId } })
      : null,
    run.salaryUploadId
      ? prisma.uploadFile.findUnique({ where: { id: run.salaryUploadId } })
      : null
  ]);

  const employeesRows = Array.isArray(staging.employees) ? staging.employees : null;
  const salariesRows = Array.isArray(staging.salaries) ? staging.salaries : null;

  return {
    run: formatRun(run),
    staging: {
      employees: employeesRows,
      salaries: salariesRows
    },
    uploads: {
      employees: formatUpload(employeeUpload),
      salaries: formatUpload(salaryUpload)
    },
    wizardProgress: buildWizardProgress(employeesRows, salariesRows, run.status)
  };
}

function buildWizardProgress(employeesRows, salariesRows, status) {
  const employeesUploaded = Array.isArray(employeesRows) && employeesRows.length > 0;
  const salariesUploaded = Array.isArray(salariesRows) && salariesRows.length > 0;

  let suggestedStep = 1;
  if (FINALIZED_STATUSES.has(status)) {
    suggestedStep = 7;
  } else if (employeesUploaded && !salariesUploaded) {
    suggestedStep = 2;
  } else if (employeesUploaded && salariesUploaded) {
    if (status === 'completed') {
      suggestedStep = 6;
    } else {
      suggestedStep = status === 'validated' ? 4 : 3;
    }
  }

  return {
    employeesUploaded,
    salariesUploaded,
    employeesRowCount: employeesUploaded ? employeesRows.length : 0,
    salariesRowCount: salariesUploaded ? salariesRows.length : 0,
    suggestedStep
  };
}

function formatRun(run) {
  return {
    id: run.id,
    month: run.month,
    year: run.year,
    status: run.status,
    dateProcessed: run.dateProcessed ? run.dateProcessed.toISOString().split('T')[0] : null,
    employeesCount: run.employeesCount,
    totalGross: Number(run.totalGross),
    totalDeductions: Number(run.totalDeductions),
    totalNet: Number(run.totalNet),
    emailsSent: run.emailsSent,
    emailsFailed: run.emailsFailed,
    generatedBy: run.generatedBy,
    employeeUploadId: run.employeeUploadId,
    salaryUploadId: run.salaryUploadId,
    createdAt: run.createdAt.toISOString()
  };
}

function formatUpload(upload) {
  if (!upload) return null;
  return {
    id: upload.id,
    type: upload.type,
    originalName: upload.originalName,
    mimeType: upload.mimeType,
    rowCount: upload.rowCount,
    uploadedAt: upload.uploadedAt.toISOString(),
    uploadedBy: upload.uploadedBy
  };
}

async function assertRunCanProcess(runId) {
  const run = await prisma.payrollRun.findUnique({ where: { id: runId } });
  if (!run) {
    throw new AppError(`Payroll run ${runId} not found.`, 404, 'RUN_NOT_FOUND');
  }
  if (FINALIZED_STATUSES.has(run.status)) {
    throw new AppError(
      `Payroll run ${runId} is finalized and cannot be modified.`,
      409,
      'RUN_NOT_EDITABLE'
    );
  }
  return run;
}

async function assertRunEditable(runId) {
  return assertRunCanProcess(runId);
}
