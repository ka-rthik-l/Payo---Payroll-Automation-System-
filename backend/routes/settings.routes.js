import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { settingsController } from '../controllers/settings.controller.js';

const router = Router();

router.get('/', asyncHandler(settingsController.getSettings));
router.patch('/company', asyncHandler(settingsController.updateCompany));
router.patch('/calendar', asyncHandler(settingsController.updateCalendar));

export default router;
