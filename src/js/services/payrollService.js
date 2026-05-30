import { apiClient } from './apiClient.js';

export const payrollService = {
  getEmployeeCSVTemplate() {
    return `id,name,email,department,role
EMP001,Jane Cooper,jane.cooper@payo.co,Engineering,Staff Engineer
EMP002,Cody Fisher,cody.fisher@payo.co,Product,Product Manager
EMP003,Esther Howard,esther.howard@payo.co,Marketing,Brand Designer
EMP004,Jenny Wilson,jenny.wilson@payo.co,Sales,Account Executive
EMP005,Kristin Watson,kristin.watson@payo.co,Engineering,Frontend Engineer`;
  },

  getSalaryCSVTemplate() {
    return `employee_id,base_salary,hra,allowances,deductions
EMP001,12000,3000,1500,2500
EMP002,10000,2500,1200,2000
EMP003,8500,2000,1000,1500
EMP004,9000,2200,1100,1250
EMP005,9000,2200,1100,1000`;
  },

  async getOrCreateCurrentRun() {
    const res = await apiClient.post('/payroll/runs/current');
    return res.data;
  },

  async getRunById(runId) {
    const res = await apiClient.get(`/payroll/runs/${runId}`);
    return res.data;
  },

  async uploadEmployees(runId, file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post(`/payroll/runs/${runId}/upload/employees`, formData);
    return res.data;
  },

  async uploadSalaries(runId, file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post(`/payroll/runs/${runId}/upload/salaries`, formData);
    return res.data;
  },

  async validateRun(runId) {
    const res = await apiClient.post(`/payroll/runs/${runId}/validate`);
    return res.data;
  },

  async resetStaging(runId) {
    const res = await apiClient.post(`/payroll/runs/${runId}/reset-staging`);
    return res.data;
  },

  async calculateRun(runId) {
    const res = await apiClient.post(`/payroll/runs/${runId}/calculate`);
    return res.data;
  },

  async finalizeRun(runId) {
    const res = await apiClient.post(`/payroll/runs/${runId}/finalize`);
    return res.data;
  },

  async getPayrollRuns() {
    const res = await apiClient.get('/payroll/runs');
    return res.data;
  },

  async getAllPayslips(search = '', month = '', year = '') {
    const res = await apiClient.get('/payslips', {
      query: { search, month, year }
    });
    return res.data;
  },

  hydrateRunState(data) {
    return {
      runId: data.run?.id,
      runMeta: data.run,
      parsedEmployees: data.staging?.employees || [],
      parsedSalaries: data.staging?.salaries || [],
      employeeFile: data.uploads?.employees
        ? { name: data.uploads.employees.originalName }
        : null,
      salaryFile: data.uploads?.salaries
        ? { name: data.uploads.salaries.originalName }
        : null
    };
  }
};
