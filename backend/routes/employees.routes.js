import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { employeesController } from '../controllers/employees.controller.js';

const router = Router();

router.get('/departments', asyncHandler(employeesController.getDepartments));
router.get('/', asyncHandler(employeesController.list));
router.get('/:id', asyncHandler(employeesController.getById));
router.post('/', asyncHandler(employeesController.create));
router.delete('/:id', asyncHandler(employeesController.remove));

export default router;
