import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { payslipsController } from '../controllers/payslips.controller.js';

const router = Router();

router.get('/', asyncHandler(payslipsController.list));
router.get('/:id/pdf-data', asyncHandler(payslipsController.getPdfData));
router.get('/:id/pdf', asyncHandler(payslipsController.downloadPdf));
router.get('/:id', asyncHandler(payslipsController.getById));

export default router;
