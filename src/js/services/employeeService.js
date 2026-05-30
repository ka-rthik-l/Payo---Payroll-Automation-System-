import { apiClient } from './apiClient.js';

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
    const res = await apiClient.get('/employees/departments');
    return res.data;
  },

  async addEmployee(employeeData) {
    const res = await apiClient.post('/employees', employeeData);
    return res.data;
  },

  async deleteEmployee(id) {
    await apiClient.delete(`/employees/${id}`);
    return true;
  }
};
