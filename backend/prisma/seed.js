import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const employees = [
  { id: 'EMP001', name: 'Jane Cooper', email: 'jane.cooper@payo.co', department: 'Engineering', role: 'Staff Engineer' },
  { id: 'EMP002', name: 'Cody Fisher', email: 'cody.fisher@payo.co', department: 'Product', role: 'Product Manager' },
  { id: 'EMP003', name: 'Esther Howard', email: 'esther.howard@payo.co', department: 'Marketing', role: 'Brand Designer' },
  { id: 'EMP004', name: 'Jenny Wilson', email: 'jenny.wilson@payo.co', department: 'Sales', role: 'Account Executive' },
  { id: 'EMP005', name: 'Kristin Watson', email: 'kristin.watson@payo.co', department: 'Engineering', role: 'Frontend Engineer' }
];

const aprilPayslips = [
  { id: 'PS-202604-EMP001', runId: 'RUN-202604', employeeId: 'EMP001', employeeName: 'Jane Cooper', month: 'April', year: '2026', baseSalary: 12000, hra: 3000, allowances: 1500, deductions: 2500, netSalary: 14000 },
  { id: 'PS-202604-EMP002', runId: 'RUN-202604', employeeId: 'EMP002', employeeName: 'Cody Fisher', month: 'April', year: '2026', baseSalary: 10000, hra: 2500, allowances: 1200, deductions: 2000, netSalary: 11700 },
  { id: 'PS-202604-EMP003', runId: 'RUN-202604', employeeId: 'EMP003', employeeName: 'Esther Howard', month: 'April', year: '2026', baseSalary: 8500, hra: 2000, allowances: 1000, deductions: 1500, netSalary: 10000 },
  { id: 'PS-202604-EMP004', runId: 'RUN-202604', employeeId: 'EMP004', employeeName: 'Jenny Wilson', month: 'April', year: '2026', baseSalary: 9000, hra: 2200, allowances: 1100, deductions: 1250, netSalary: 11050 },
  { id: 'PS-202604-EMP005', runId: 'RUN-202604', employeeId: 'EMP005', employeeName: 'Kristin Watson', month: 'April', year: '2026', baseSalary: 9000, hra: 2200, allowances: 1100, deductions: 1000, netSalary: 11300 }
];

async function main() {
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      companyName: 'Payo Operations Corp',
      address: '100 Pine Street, San Francisco, CA',
      taxId: 'XX-XXXXXXX',
      emailSender: 'payroll@payo.co',
      smtpHost: 'smtp.payo.co',
      smtpPort: 587,
      currency: 'USD',
      activePeriodMonth: 'May',
      activePeriodYear: '2026'
    }
  });

  for (const emp of employees) {
    await prisma.employee.upsert({
      where: { id: emp.id },
      update: {},
      create: emp
    });
  }

  const runs = [
    {
      id: 'RUN-202604',
      month: 'April',
      year: '2026',
      status: 'emails_sent',
      dateProcessed: new Date('2026-04-30'),
      employeesCount: 5,
      totalGross: 48500,
      totalDeductions: 8250,
      totalNet: 40250,
      emailsSent: 5,
      emailsFailed: 0,
      generatedBy: 'system'
    },
    {
      id: 'RUN-202603',
      month: 'March',
      year: '2026',
      status: 'emails_sent',
      dateProcessed: new Date('2026-03-31'),
      employeesCount: 5,
      totalGross: 48500,
      totalDeductions: 8250,
      totalNet: 40250,
      emailsSent: 5,
      emailsFailed: 0,
      generatedBy: 'system'
    }
  ];

  for (const run of runs) {
    await prisma.payrollRun.upsert({
      where: { id: run.id },
      update: {},
      create: run
    });
  }

  for (const payslip of aprilPayslips) {
    await prisma.payslip.upsert({
      where: { id: payslip.id },
      update: {},
      create: payslip
    });
  }

  const emailLogs = [
    { id: 'MSG-202604-EMP001', runId: 'RUN-202604', employeeId: 'EMP001', employeeName: 'Jane Cooper', recipient: 'jane.cooper@payo.co', subject: 'Your Payslip for April 2026', status: 'delivered', attempts: 1, lastAttemptAt: new Date('2026-04-30T10:01:12') },
    { id: 'MSG-202604-EMP002', runId: 'RUN-202604', employeeId: 'EMP002', employeeName: 'Cody Fisher', recipient: 'cody.fisher@payo.co', subject: 'Your Payslip for April 2026', status: 'delivered', attempts: 1, lastAttemptAt: new Date('2026-04-30T10:01:25') },
    { id: 'MSG-202604-EMP003', runId: 'RUN-202604', employeeId: 'EMP003', employeeName: 'Esther Howard', recipient: 'esther.howard@payo.co', subject: 'Your Payslip for April 2026', status: 'delivered', attempts: 1, lastAttemptAt: new Date('2026-04-30T10:01:34') },
    { id: 'MSG-202604-EMP004', runId: 'RUN-202604', employeeId: 'EMP004', employeeName: 'Jenny Wilson', recipient: 'jenny.wilson@payo.co', subject: 'Your Payslip for April 2026', status: 'delivered', attempts: 1, lastAttemptAt: new Date('2026-04-30T10:01:42') },
    { id: 'MSG-202604-EMP005', runId: 'RUN-202604', employeeId: 'EMP005', employeeName: 'Kristin Watson', recipient: 'kristin.watson@payo.co', subject: 'Your Payslip for April 2026', status: 'delivered', attempts: 1, lastAttemptAt: new Date('2026-04-30T10:01:50') }
  ];

  for (const log of emailLogs) {
    await prisma.emailLog.upsert({
      where: { id: log.id },
      update: {},
      create: log
    });
  }

  console.log('Seed completed.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
