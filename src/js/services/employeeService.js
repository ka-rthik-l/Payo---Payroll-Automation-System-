import { apiClient } from './apiClient.js';

let deptCache = null;

export const employeeService = {
  async getEmployees(search = '', department = '') {
    const res = await apiClient.get('/employees', {
      query: { search, department }
    });
    return res.data;
  },

  async getEmployeeById(id) {
    const res = await apiClient.get(`/employees/${id}`);
    return res.data;
  },

  async getDepartments() {
    if (deptCache) return deptCache;
    const res = await apiClient.get('/employees/departments');
    deptCache = res.data;
    return deptCache;
  },

  async addEmployee(employeeData) {
    const res = await apiClient.post('/employees', employeeData);
    deptCache = null;
    return res.data;
  },

  async deleteEmployee(id) {
    await apiClient.delete(`/employees/${id}`);
    deptCache = null;
    return true;
  }
};
