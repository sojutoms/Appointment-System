import { Router } from 'express';
import {
  createStaff,
  deleteStaff,
  getStaff,
  getUnavailableDates,
  inviteStaff,
  listStaff,
  revokeStaffAccess,
  updateStaff,
} from '../controllers/staffController.js';
import { optionalAuth, protect, requireAdmin } from '../middleware/auth.js';
import { createStaffRules, mongoIdParam, unavailableRules, updateStaffRules } from '../validators/rules.js';

const router = Router();

// Public reads; staff emails and account status are only included for the admin panel.
router.get('/', optionalAuth, listStaff);
router.get('/:id', optionalAuth, mongoIdParam, getStaff);
router.get('/:id/unavailable', unavailableRules, getUnavailableDates);

// Changes are admin-panel only.
router.post('/', protect, requireAdmin, createStaffRules, createStaff);
router.put('/:id', protect, requireAdmin, updateStaffRules, updateStaff);
router.delete('/:id', protect, requireAdmin, mongoIdParam, deleteStaff);

// Staff-portal access.
router.post('/:id/invite', protect, requireAdmin, mongoIdParam, inviteStaff);
router.delete('/:id/access', protect, requireAdmin, mongoIdParam, revokeStaffAccess);

export default router;
