import { Router } from 'express';
import { createStaff, deleteStaff, getStaff, listStaff, updateStaff } from '../controllers/staffController.js';
import { authorize, optionalAuth, protect } from '../middleware/auth.js';
import { createStaffRules, mongoIdParam, updateStaffRules } from '../validators/rules.js';

const router = Router();

router.get('/', optionalAuth, listStaff);
router.get('/:id', mongoIdParam, getStaff);

router.post('/', protect, authorize('admin'), createStaffRules, createStaff);
router.put('/:id', protect, authorize('admin'), updateStaffRules, updateStaff);
router.delete('/:id', protect, authorize('admin'), mongoIdParam, deleteStaff);

export default router;
