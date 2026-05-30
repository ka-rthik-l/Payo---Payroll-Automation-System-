import prisma from '../utils/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { numberToWords } from '../utils/numberToWords.js';
import { generatePayslipPdf, buildPdfFilename } from './pdf/payslipPdf.generator.js';

export const pdfService = {
  async getAllPayslips(search = '', month = '', year = '') {
    const payslips = await prisma.payslip.findMany({
      orderBy: [{ year: 'desc' }, { month: 'desc' }, { employeeName: 'asc' }]
    });

    return payslips
      .filter((p) => {
        if (month && p.month !== month) return false;
        if (year && String(p.year) !== String(year)) return false;
        if (search) {
          const query = search.toLowerCase();
          return (
            p.employeeName.toLowerCase().includes(query) ||
            p.employeeId.toLowerCase().includes(query)
          );
        }
        return true;
      })
      .map(formatPayslip);
  },

  async getPayslipById(payslipId) {
    const payslip = await prisma.payslip.findUnique({ where: { id: payslipId } });
    if (!payslip) {
      throw new AppError(`Payslip ${payslipId} not found.`, 404, 'PAYSLIP_NOT_FOUND');
    }
    return formatPayslip(payslip);
  },

  async getPayslipPdfData(payslipId) {
    return this.compilePayslipData(payslipId);
  },

  async compilePayslipData(payslipId) {
    const payslip = await prisma.payslip.findUnique({ where: { id: payslipId } });
    if (!payslip) {
      throw new AppError(`Payslip ${payslipId} not found.`, 404, 'PAYSLIP_NOT_FOUND');
    }

    const employee = await prisma.employee.findUnique({ where: { id: payslip.employeeId } });
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });

    if (!employee) {
      throw new AppError(`Employee ${payslip.employeeId} not found.`, 404, 'EMPLOYEE_NOT_FOUND');
    }
    if (!settings) {
      throw new AppError('Settings not found.', 404, 'SETTINGS_NOT_FOUND');
    }

    const base = Number(payslip.baseSalary);
    const hra = Number(payslip.hra);
    const allowances = Number(payslip.allowances);
    const deductions = Number(payslip.deductions);
    const gross = base + hra + allowances;
    const net = Number(payslip.netSalary);

    return {
      metadata: {
        documentType: 'PAYSLIP',
        generatedAt: new Date().toISOString(),
        payslipId: payslip.id,
        runId: payslip.runId
      },
      company: {
        name: settings.companyName,
        address: settings.address,
        taxId: settings.taxId
      },
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        department: employee.department,
        role: employee.role
      },
      period: {
        month: payslip.month,
        year: payslip.year
      },
      financials: {
        currency: settings.currency,
        earnings: {
          basic: base,
          hra,
          allowances,
          totalGross: gross
        },
        deductions: {
          taxDeductions: deductions,
          totalDeductions: deductions
        },
        netPay: net,
        netPayInWords: numberToWords(Math.floor(net))
      }
    };
  },

  async generatePayslipPdfBuffer(payslipId) {
    const data = await this.compilePayslipData(payslipId);
    const buffer = await generatePayslipPdf(data);
    const filename = buildPdfFilename(data.employee.id, data.period.month, data.period.year);
    return { buffer, filename, data };
  },

  async findPayslipForEmail(runId, employeeId) {
    return prisma.payslip.findFirst({
      where: { runId, employeeId }
    });
  }
};

function formatPayslip(payslip) {
  const base = Number(payslip.baseSalary);
  const hra = Number(payslip.hra);
  const allowances = Number(payslip.allowances);

  return {
    id: payslip.id,
    runId: payslip.runId,
    employeeId: payslip.employeeId,
    employeeName: payslip.employeeName,
    month: payslip.month,
    year: payslip.year,
    baseSalary: base,
    hra,
    allowances,
    deductions: Number(payslip.deductions),
    grossSalary: base + hra + allowances,
    netSalary: Number(payslip.netSalary)
  };
}
