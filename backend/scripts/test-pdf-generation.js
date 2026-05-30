import { generatePayslipPdf, buildPdfFilename } from '../services/pdf/payslipPdf.generator.js';
import fs from 'fs';

const sample = {
  metadata: {
    documentType: 'PAYSLIP',
    generatedAt: new Date().toISOString(),
    payslipId: 'PS-202604-EMP001',
    runId: 'RUN-202604'
  },
  company: {
    name: 'Payo Operations Corp',
    address: '100 Pine Street, San Francisco, CA',
    taxId: 'XX-XXXXXXX'
  },
  employee: {
    id: 'EMP001',
    name: 'Jane Cooper',
    email: 'jane.cooper@payo.co',
    department: 'Engineering',
    role: 'Staff Engineer'
  },
  period: { month: 'April', year: '2026' },
  financials: {
    currency: 'USD',
    earnings: { basic: 12000, hra: 3000, allowances: 1500, totalGross: 16500 },
    deductions: { taxDeductions: 2500, totalDeductions: 2500 },
    netPay: 14000,
    netPayInWords: 'Fourteen Thousand Only'
  }
};

const buffer = await generatePayslipPdf(sample);
const filename = buildPdfFilename(sample.employee.id, sample.period.month, sample.period.year);
fs.writeFileSync(`./test-fixtures/${filename}`, buffer);
console.log(`Generated ${filename} (${buffer.length} bytes)`);
