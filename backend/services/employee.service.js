import prisma from '../utils/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { generateEmployeeId } from '../utils/idGenerator.js';

const EMAIL_REGEX = /\S+@\S+\.\S+/;

export const employeeService = {
  async getEmployees(search = '', department = '') {
    const employees = await prisma.employee.findMany({ orderBy: { id: 'asc' } });

    return employees.filter((emp) => {
      if (department && emp.department !== department) return false;
      if (search) {
        const query = search.toLowerCase().trim();
        return (
          emp.name.toLowerCase().includes(query) ||
          emp.email.toLowerCase().includes(query) ||
          emp.id.toLowerCase().includes(query)
        );
      }
      return true;
    });
  },

  async getEmployeeById(id) {
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) {
      throw new AppError(`Employee ${id} not found.`, 404, 'EMPLOYEE_NOT_FOUND');
    }

    const lastPayslip = await prisma.payslip.findFirst({
      where: { employeeId: id },
      orderBy: [{ year: 'desc' }, { month: 'desc' }]
    });

    return { ...employee, lastPayslip };
  },

  async getDepartments() {
    const employees = await prisma.employee.findMany({ select: { department: true } });
    const depts = [...new Set(employees.map((e) => e.department).filter(Boolean))];
    return depts.sort();
  },

  async addEmployee(data) {
    const employees = await prisma.employee.findMany({ select: { id: true } });

    let id = data.id?.trim();
    if (!id) {
      id = generateEmployeeId(employees.map((e) => e.id));
    } else {
      const exists = employees.some((emp) => emp.id === id);
      if (exists) {
        throw new AppError(`An employee with ID "${id}" already exists.`, 409, 'DUPLICATE_EMPLOYEE_ID');
      }
    }

    const email = data.email?.trim();
    if (!email || !EMAIL_REGEX.test(email)) {
      throw new AppError('Please enter a valid email address.', 400, 'INVALID_EMAIL');
    }

    const birthYear = data.birthYear != null && data.birthYear !== ''
      ? parseInt(data.birthYear, 10)
      : null;

    if (birthYear != null && (isNaN(birthYear) || birthYear < 1900 || birthYear > new Date().getFullYear())) {
      throw new AppError('birthYear must be a valid year.', 400, 'INVALID_BIRTH_YEAR');
    }

    try {
      return await prisma.employee.create({
        data: {
          id,
          name: data.name?.trim(),
          email,
          department: data.department?.trim() || 'General',
          role: data.role?.trim() || 'Associate',
          birthYear
        }
      });
    } catch (err) {
      if (err.code === 'P2002') {
        throw new AppError('An employee with this email already exists.', 409, 'DUPLICATE_EMAIL');
      }
      throw err;
    }
  },

  async deleteEmployee(id) {
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) {
      throw new AppError(`Employee ${id} not found.`, 404, 'EMPLOYEE_NOT_FOUND');
    }
    try {
      await prisma.employee.delete({ where: { id } });
    } catch (err) {
      if (err.code === 'P2003') {
        throw new AppError(
          'Cannot delete employee with existing payslips or email records.',
          409,
          'EMPLOYEE_HAS_PAYROLL_DATA'
        );
      }
      throw err;
    }
    return true;
  }
};
