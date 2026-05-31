/* LocalStorage database provider simulating network delay */

export class LocalStorageProvider {
  constructor() {
    this.prefix = 'payo_db_';
    this.delayMin = 50;
    this.delayMax = 200;
  }

  // Helper to simulate API round-trip delay
  async _delay() {
    const delay = Math.random() * (this.delayMax - this.delayMin) + this.delayMin;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  _readTable(table) {
    const data = localStorage.getItem(this.prefix + table);
    return data ? JSON.parse(data) : [];
  }

  _writeTable(table, data) {
    localStorage.setItem(this.prefix + table, JSON.stringify(data));
  }

  async init() {
    await this._delay();
    
    // Seed settings table if empty
    if (!localStorage.getItem(this.prefix + 'settings')) {
      this._writeTable('settings', {
        companyName: 'Payo Operations Corp',
        address: '100 Pine Street, San Francisco, CA',
        taxId: 'XX-XXXXXXX',
        emailSender: 'payroll@payo.co',
        currency: 'USD',
        activePeriodMonth: 'May',
        activePeriodYear: '2026'
      });
    }

    // Seed employees table if empty
    if (!localStorage.getItem(this.prefix + 'employees')) {
      this._writeTable('employees', [
        { id: 'EMP001', name: 'Jane Cooper', email: 'jane.cooper@payo.co', department: 'Engineering', role: 'Staff Engineer' },
        { id: 'EMP002', name: 'Cody Fisher', email: 'cody.fisher@payo.co', department: 'Product', role: 'Product Manager' },
        { id: 'EMP003', name: 'Esther Howard', email: 'esther.howard@payo.co', department: 'Marketing', role: 'Brand Designer' },
        { id: 'EMP004', name: 'Jenny Wilson', email: 'jenny.wilson@payo.co', department: 'Sales', role: 'Account Executive' },
        { id: 'EMP005', name: 'Kristin Watson', email: 'kristin.watson@payo.co', department: 'Engineering', role: 'Frontend Engineer' }
      ]);
    }

    // Seed historical payroll runs if empty
    if (!localStorage.getItem(this.prefix + 'payroll_runs')) {
      this._writeTable('payroll_runs', [
        {
          id: 'RUN-202604',
          month: 'April',
          year: '2026',
          status: 'completed',
          dateProcessed: '2026-04-30',
          employeesCount: 5,
          totalGross: 48500,
          totalDeductions: 8250,
          totalNet: 40250,
          emailsSent: 5,
          emailsFailed: 0
        },
        {
          id: 'RUN-202603',
          month: 'March',
          year: '2026',
          status: 'completed',
          dateProcessed: '2026-03-31',
          employeesCount: 5,
          totalGross: 48500,
          totalDeductions: 8250,
          totalNet: 40250,
          emailsSent: 5,
          emailsFailed: 0
        }
      ]);
    }

    // Seed historical payslips if empty
    if (!localStorage.getItem(this.prefix + 'payslips')) {
      const AprilRunPayslips = [
        { id: 'PS-202604-EMP001', runId: 'RUN-202604', employeeId: 'EMP001', employeeName: 'Jane Cooper', month: 'April', year: '2026', baseSalary: 12000, hra: 3000, allowances: 1500, deductions: 2500, netSalary: 14000 },
        { id: 'PS-202604-EMP002', runId: 'RUN-202604', employeeId: 'EMP002', employeeName: 'Cody Fisher', month: 'April', year: '2026', baseSalary: 10000, hra: 2500, allowances: 1200, deductions: 2000, netSalary: 11700 },
        { id: 'PS-202604-EMP003', runId: 'RUN-202604', employeeId: 'EMP003', employeeName: 'Esther Howard', month: 'April', year: '2026', baseSalary: 8500, hra: 2000, allowances: 1000, deductions: 1500, netSalary: 10000 },
        { id: 'PS-202604-EMP004', runId: 'RUN-202604', employeeId: 'EMP004', employeeName: 'Jenny Wilson', month: 'April', year: '2026', baseSalary: 9000, hra: 2200, allowances: 1100, deductions: 1250, netSalary: 11050 },
        { id: 'PS-202604-EMP005', runId: 'RUN-202604', employeeId: 'EMP005', employeeName: 'Kristin Watson', month: 'April', year: '2026', baseSalary: 9000, hra: 2200, allowances: 1100, deductions: 1000, netSalary: 11300 }
      ];
      this._writeTable('payslips', AprilRunPayslips);
    }

    // Seed historical email logs if empty
    if (!localStorage.getItem(this.prefix + 'email_logs')) {
      this._writeTable('email_logs', [
        { id: 'MSG-001', runId: 'RUN-202604', employeeId: 'EMP001', employeeName: 'Jane Cooper', recipient: 'jane.cooper@payo.co', subject: 'Your Payslip for April 2026', status: 'delivered', timestamp: '2026-04-30 10:01:12', attempts: 1 },
        { id: 'MSG-002', runId: 'RUN-202604', employeeId: 'EMP002', employeeName: 'Cody Fisher', recipient: 'cody.fisher@payo.co', subject: 'Your Payslip for April 2026', status: 'delivered', timestamp: '2026-04-30 10:01:25', attempts: 1 },
        { id: 'MSG-003', runId: 'RUN-202604', employeeId: 'EMP003', employeeName: 'Esther Howard', recipient: 'esther.howard@payo.co', subject: 'Your Payslip for April 2026', status: 'delivered', timestamp: '2026-04-30 10:01:34', attempts: 1 },
        { id: 'MSG-004', runId: 'RUN-202604', employeeId: 'EMP004', employeeName: 'Jenny Wilson', recipient: 'jenny.wilson@payo.co', subject: 'Your Payslip for April 2026', status: 'delivered', timestamp: '2026-04-30 10:01:42', attempts: 1 },
        { id: 'MSG-005', runId: 'RUN-202604', employeeId: 'EMP005', employeeName: 'Kristin Watson', recipient: 'kristin.watson@payo.co', subject: 'Your Payslip for April 2026', status: 'delivered', timestamp: '2026-04-30 10:01:50', attempts: 1 }
      ]);
    }
  }

  async get(table, filterFn = null) {
    await this._delay();
    const list = this._readTable(table);
    return filterFn ? list.filter(filterFn) : list;
  }

  async find(table, id) {
    await this._delay();
    const list = this._readTable(table);
    return list.find(item => item.id === id) || null;
  }

  async create(table, record) {
    await this._delay();
    const list = this._readTable(table);
    list.push(record);
    this._writeTable(table, list);
    return record;
  }

  async update(table, id, updates) {
    await this._delay();
    const list = this._readTable(table);
    const index = list.findIndex(item => item.id === id);
    if (index === -1) throw new Error(`Record with ID ${id} not found in ${table}`);
    
    list[index] = { ...list[index], ...updates };
    this._writeTable(table, list);
    return list[index];
  }

  async delete(table, id) {
    await this._delay();
    const list = this._readTable(table);
    const filtered = list.filter(item => item.id !== id);
    this._writeTable(table, filtered);
    return true;
  }

  async clear(table) {
    await this._delay();
    this._writeTable(table, []);
    return true;
  }
}
