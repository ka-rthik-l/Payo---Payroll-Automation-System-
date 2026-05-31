import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { emailsController } from '../controllers/emails.controller.js';

const router = Router();

router.get('/metrics', asyncHandler(emailsController.metrics));
router.post('/retry', asyncHandler(emailsController.retryAll));
router.post('/test-connection', asyncHandler(emailsController.testConnection));
router.get('/', asyncHandler(emailsController.list));
router.post('/:id/retry', asyncHandler(emailsController.retryOne));

export default router;
