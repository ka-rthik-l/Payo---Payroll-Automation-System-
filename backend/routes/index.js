import { Router } from 'express';
import healthRoutes from './health.routes.js';
import settingsRoutes from './settings.routes.js';
import employeesRoutes from './employees.routes.js';
import payrollRoutes from './payroll.routes.js';
import payslipsRoutes from './payslips.routes.js';
import emailsRoutes from './emails.routes.js';
import dashboardRoutes from './dashboard.routes.js';

const router = Router();

router.use(healthRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/settings', settingsRoutes);
router.use('/employees', employeesRoutes);
router.use('/payroll', payrollRoutes);
router.use('/payslips', payslipsRoutes);
router.use('/emails', emailsRoutes);
router.use('/email', emailsRoutes); // Alias to meet exact endpoint requirement

export default router;
