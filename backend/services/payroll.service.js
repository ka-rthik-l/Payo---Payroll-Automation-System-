import { generatePayslipId, generateEmailLogId } from '../utils/idGenerator.js';
import { AppError } from '../middleware/errorHandler.js';

const EMAIL_REGEX = /\S+@\S+\.\S+/;

export const payrollService = {
  validateEmployees(parsedEmployees) {
    const report = [];
    const ids = new Set();
    const emails = new Set();

    if (!parsedEmployees || parsedEmployees.length === 0) {
      report.push({ type: 'error', title: 'File Empty', desc: 'No records found in employee data.' });
      return report;
    }

    const first = parsedEmployees[0];
    const required = ['id', 'name', 'email'];
    for (const req of required) {
      if (!(req in first)) {
        report.push({ type: 'error', title: 'Missing Columns', desc: `Required column "${req}" was not found.` });
        return report;
      }
    }

    parsedEmployees.forEach((emp, index) => {
      const rowNum = index + 2;

      if (!emp.id) {
        report.push({ type: 'error', title: 'Missing ID', desc: `Row ${rowNum}: Employee ID is blank.` });
      } else if (ids.has(emp.id)) {
        report.push({ type: 'error', title: 'Duplicate ID', desc: `Row ${rowNum}: Employee ID "${emp.id}" is duplicated.` });
      } else {
        ids.add(emp.id);
      }

      if (!emp.email) {
        report.push({ type: 'error', title: 'Missing Email', desc: `Row ${rowNum}: Email address is blank.` });
      } else if (!EMAIL_REGEX.test(emp.email)) {
        report.push({ type: 'error', title: 'Invalid Email Format', desc: `Row ${rowNum}: Email "${emp.email}" has bad format.` });
      } else if (emails.has(emp.email)) {
        report.push({ type: 'error', title: 'Duplicate Email Address', desc: `Row ${rowNum}: Email "${emp.email}" is shared by another employee.` });
      } else {
        emails.add(emp.email);
      }

      if (!emp.name) {
        report.push({ type: 'error', title: 'Missing Name', desc: `Row ${rowNum}: Employee Name is blank.` });
      }
    });

    if (report.length === 0) {
      report.push({
        type: 'success',
        title: 'Employee Validation Passed',
        desc: `All ${parsedEmployees.length} employee structures verified.`
      });
    }

    return report;
  },

  validateSalaries(parsedSalaries, employeeSource) {
    const report = [];
    const salaryIds = new Set();

    if (!parsedSalaries || parsedSalaries.length === 0) {
      report.push({ type: 'error', title: 'File Empty', desc: 'No records found in salary data.' });
      return report;
    }

    const first = parsedSalaries[0];
    const required = ['employee_id', 'base_salary', 'hra', 'allowances', 'deductions'];
    for (const req of required) {
      if (!(req in first)) {
        report.push({ type: 'error', title: 'Missing Columns', desc: `Required column "${req}" was not found.` });
        return report;
      }
    }

    const sourceIds = new Set(
      (employeeSource || []).map((e) => e.id).filter(Boolean)
    );

    parsedSalaries.forEach((sal, index) => {
      const rowNum = index + 2;
      const id = sal.employee_id;

      if (!id) {
        report.push({ type: 'error', title: 'Missing Employee ID Reference', desc: `Row ${rowNum}: employee_id is blank.` });
        return;
      }

      if (salaryIds.has(id)) {
        report.push({ type: 'error', title: 'Duplicate Salary Record', desc: `Row ${rowNum}: Employee ID "${id}" has multiple salary inputs.` });
      } else {
        salaryIds.add(id);
      }

      if (!sourceIds.has(id)) {
        report.push({
          type: 'error',
          title: 'Employee Reference Not Found',
          desc: `Row ${rowNum}: Employee ID "${id}" does not exist in the uploaded employee data.`
        });
      }

      const base = parseFloat(sal.base_salary);
      const hra = parseFloat(sal.hra);
      const allowances = parseFloat(sal.allowances);
      const deductions = parseFloat(sal.deductions);

      if (isNaN(base) || base < 0) {
        report.push({ type: 'error', title: 'Invalid Base Salary', desc: `Row ${rowNum}: Base Salary "${sal.base_salary}" must be a positive number.` });
      }
      if (isNaN(hra) || hra < 0) {
        report.push({ type: 'warning', title: 'Invalid HRA Rounded', desc: `Row ${rowNum}: HRA "${sal.hra}" was rounded to 0.` });
      }
      if (isNaN(allowances) || allowances < 0) {
        report.push({ type: 'warning', title: 'Invalid Allowances Rounded', desc: `Row ${rowNum}: Allowances "${sal.allowances}" were rounded to 0.` });
      }
      if (isNaN(deductions) || deductions < 0) {
        report.push({ type: 'error', title: 'Invalid Deductions Value', desc: `Row ${rowNum}: Deductions "${sal.deductions}" must be a positive number.` });
      }

      if (!isNaN(base) && !isNaN(hra) && !isNaN(allowances) && !isNaN(deductions)) {
        const gross = base + hra + allowances;
        if (deductions > gross) {
          report.push({
            type: 'warning',
            title: 'Negative Net Salary',
            desc: `Row ${rowNum}: Deductions exceed Gross Earnings for "${id}". Net salary will resolve to $0.`
          });
        }
      }
    });

    sourceIds.forEach((sourceId) => {
      if (sourceId && !salaryIds.has(sourceId)) {
        report.push({
          type: 'warning',
          title: 'Missing Salary Record',
          desc: `Employee "${sourceId}" was not found in the uploaded salary CSV. They will be skipped in this run.`
        });
      }
    });

    if (report.filter((r) => r.type === 'error').length === 0) {
      report.push({
        type: 'success',
        title: 'Salary Validation Completed',
        desc: `Verified ${parsedSalaries.length} salary records.`
      });
    }

    return report;
  },

  validateRunData(employees, salaries) {
    const employeeReport = this.validateEmployees(employees);
    const salaryReport = this.validateSalaries(salaries, employees);
    return [...employeeReport, ...salaryReport];
  },

  hasValidationErrors(report) {
    return report.some((item) => item.type === 'error');
  },

  calculatePayroll(employeesList, salariesList) {
    const list = [];

    (salariesList || []).forEach((sal) => {
      const emp = (employeesList || []).find((e) => e.id === sal.employee_id) || {
        id: sal.employee_id,
        name: 'Unknown',
        email: 'N/A',
        department: 'N/A',
        role: 'N/A'
      };

      const base = roundMoney(Math.max(0, parseFloat(sal.base_salary) || 0));
      const hra = roundMoney(Math.max(0, parseFloat(sal.hra) || 0));
      const allowances = roundMoney(Math.max(0, parseFloat(sal.allowances) || 0));
      const deductions = roundMoney(Math.max(0, parseFloat(sal.deductions) || 0));

      const gross = roundMoney(base + hra + allowances);
      const net = roundMoney(Math.max(0, gross - deductions));

      list.push({
        employeeId: emp.id,
        employeeName: emp.name,
        email: emp.email,
        department: emp.department || 'N/A',
        role: emp.role || 'N/A',
        baseSalary: base,
        hra,
        allowances,
        deductions,
        grossSalary: gross,
        netSalary: net
      });
    });

    return list;
  },

  summarizePayroll(payrollRows) {
    const totals = payrollRows.reduce(
      (acc, row) => {
        acc.totalGross += row.grossSalary;
        acc.totalDeductions += row.deductions;
        acc.totalNet += row.netSalary;
        return acc;
      },
      { totalGross: 0, totalDeductions: 0, totalNet: 0 }
    );

    return {
      totalGross: roundMoney(totals.totalGross),
      totalDeductions: roundMoney(totals.totalDeductions),
      totalNet: roundMoney(totals.totalNet),
      employeesCount: payrollRows.length
    };
  },

  async listPayrollRuns(prismaClient) {
    const runs = await prismaClient.payrollRun.findMany();

    runs.sort((a, b) => {
      const dateA = a.dateProcessed || a.createdAt;
      const dateB = b.dateProcessed || b.createdAt;
      return dateB.getTime() - dateA.getTime();
    });

    return runs;
  },

  /**
   * Persists finalized payroll within an active Prisma transaction.
   * Updates existing run, upserts employees, creates payslips and queued email logs, clears staging.
   */
  async finalizeRun(tx, { run, employees, salaries, generatedBy }) {
    const current = await tx.payrollRun.findUnique({ where: { id: run.id } });
    if (!current || current.status !== 'validated') {
      throw new AppError(
        'Payroll run is no longer in a validated state.',
        409,
        'RUN_NOT_VALIDATED'
      );
    }

    const payroll = this.calculatePayroll(employees, salaries);
    const totals = this.summarizePayroll(payroll);
    const dateProcessed = new Date();
    const emailSubject = buildPayslipEmailSubject(run.month, run.year);

    for (const emp of employees) {
      const mapped = mapEmployeeRow(emp);
      try {
        await tx.employee.upsert({
          where: { id: mapped.id },
          update: {
            name: mapped.name,
            email: mapped.email,
            department: mapped.department,
            role: mapped.role,
            ...(mapped.birthYear != null ? { birthYear: mapped.birthYear } : {})
          },
          create: mapped
        });
      } catch (err) {
        if (err.code === 'P2002') {
          throw new AppError(
            `Employee email "${mapped.email}" is already assigned to another employee.`,
            409,
            'DUPLICATE_EMAIL'
          );
        }
        throw err;
      }
    }

    const updatedRun = await tx.payrollRun.update({
      where: { id: run.id },
      data: {
        status: 'completed',
        dateProcessed,
        generatedBy: generatedBy || 'system',
        employeesCount: totals.employeesCount,
        totalGross: totals.totalGross,
        totalDeductions: totals.totalDeductions,
        totalNet: totals.totalNet,
        emailsSent: 0,
        emailsFailed: 0
      }
    });

    for (const item of payroll) {
      await tx.payslip.create({
        data: {
          id: generatePayslipId(run.month, run.year, item.employeeId),
          runId: run.id,
          employeeId: item.employeeId,
          employeeName: item.employeeName,
          month: run.month,
          year: run.year,
          baseSalary: item.baseSalary,
          hra: item.hra,
          allowances: item.allowances,
          deductions: item.deductions,
          netSalary: item.netSalary
        }
      });
    }

    for (const item of payroll) {
      await tx.emailLog.create({
        data: {
          id: generateEmailLogId(run.month, run.year, item.employeeId),
          runId: run.id,
          employeeId: item.employeeId,
          employeeName: item.employeeName,
          recipient: item.email,
          subject: emailSubject,
          status: 'queued',
          attempts: 0
        }
      });
    }

    await tx.payrollRunStaging.deleteMany({ where: { runId: run.id } });

    return {
      run: updatedRun,
      payslipsCreated: payroll.length,
      emailsQueued: payroll.length
    };
  }
};

function mapEmployeeRow(emp) {
  const rawBirthYear = emp.birthyear ?? emp.birth_year ?? emp.birthYear;
  let birthYear = null;

  if (rawBirthYear != null && rawBirthYear !== '') {
    const parsed = parseInt(rawBirthYear, 10);
    if (!Number.isNaN(parsed)) {
      birthYear = parsed;
    }
  }

  return {
    id: emp.id,
    name: emp.name?.trim(),
    email: emp.email?.trim(),
    department: emp.department?.trim() || 'General',
    role: emp.role?.trim() || 'Associate',
    birthYear
  };
}

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

export function buildPayslipEmailSubject(month, year) {
  return `Salary Slip - ${month} ${year}`;
}
