import { payrollService } from '../services/payroll.service.js';
import assert from 'node:assert/strict';

const employees = [
  { id: 'EMP001', name: 'Jane Cooper', email: 'jane@payo.co', department: 'Eng', role: 'Dev' },
  { id: 'EMP002', name: 'Cody Fisher', email: 'cody@payo.co', department: 'Product', role: 'PM' }
];

const salaries = [
  { employee_id: 'EMP001', base_salary: '12000', hra: '3000', allowances: '1500', deductions: '2500' },
  { employee_id: 'EMP002', base_salary: '10000', hra: '2500', allowances: '1200', deductions: '2000' }
];

const report = payrollService.validateRunData(employees, salaries);
assert.equal(payrollService.hasValidationErrors(report), false);

const payroll = payrollService.calculatePayroll(employees, salaries);
const totals = payrollService.summarizePayroll(payroll);

assert.equal(payroll.length, 2);
assert.equal(payroll[0].grossSalary, 16500);
assert.equal(payroll[0].netSalary, 14000);
assert.equal(totals.totalNet, payroll[0].netSalary + payroll[1].netSalary);

const badEmail = [{ id: 'EMP001', name: 'Jane', email: 'bad' }];
const badReport = payrollService.validateEmployees(badEmail);
assert.ok(badReport.some((r) => r.type === 'error' && r.title === 'Invalid Email Format'));

console.log('payroll.service tests passed');
