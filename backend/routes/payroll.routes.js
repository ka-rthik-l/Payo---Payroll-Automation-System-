import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { uploadEmployees, uploadSalaries } from '../middleware/upload.middleware.js';
import { payrollController } from '../controllers/payroll.controller.js';

const router = Router();

router.post('/runs/current', asyncHandler(payrollController.getOrCreateCurrentRun));
router.get('/runs', asyncHandler(payrollController.listRuns));
router.get('/runs/:id', asyncHandler(payrollController.getRunById));
router.delete('/runs/:id', asyncHandler(payrollController.deleteRun));
router.post(
  '/runs/:id/upload/employees',
  uploadEmployees,
  asyncHandler(payrollController.uploadEmployees)
);
router.post(
  '/runs/:id/upload/salaries',
  uploadSalaries,
  asyncHandler(payrollController.uploadSalaries)
);
router.post('/runs/:id/validate', asyncHandler(payrollController.validateRun));
router.post('/runs/:id/calculate', asyncHandler(payrollController.calculateRun));

router.post('/runs/:id/finalize', asyncHandler(payrollController.finalizeRun));
router.post('/runs/:id/reset-staging', asyncHandler(payrollController.resetStaging));
router.post('/runs/:id/emails/send', asyncHandler(payrollController.sendEmails));

export default router;
