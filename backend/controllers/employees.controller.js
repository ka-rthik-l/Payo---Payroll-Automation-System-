import { employeeService } from '../services/employee.service.js';

export const employeesController = {
  async list(req, res) {
    const { search = '', department = '' } = req.query;
    const employees = await employeeService.getEmployees(search, department);
    res.json({ success: true, data: employees });
  },

  async getDepartments(req, res) {
    const departments = await employeeService.getDepartments();
    res.json({ success: true, data: departments });
  },

  async getById(req, res) {
    const employee = await employeeService.getEmployeeById(req.params.id);
    res.json({ success: true, data: employee });
  },

  async create(req, res) {
    const employee = await employeeService.addEmployee(req.body);
    res.status(201).json({ success: true, data: employee });
  },

  async remove(req, res) {
    await employeeService.deleteEmployee(req.params.id);
    res.json({ success: true, message: 'Employee deleted.' });
  }
};
