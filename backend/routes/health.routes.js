import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { healthController } from '../controllers/health.controller.js';

const router = Router();

router.get('/health', asyncHandler(healthController.getHealth));

export default router;
