import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { dashboardController } from '../controllers/dashboard.controller.js';

const router = Router();

router.get('/metrics', asyncHandler(dashboardController.getMetrics));

export default router;
