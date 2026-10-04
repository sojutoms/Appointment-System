import { Router } from 'express';
import {
  createService,
  deleteService,
  getService,
  listServices,
  updateService,
} from '../controllers/serviceController.js';
import { optionalAuth, protect, requireAdmin } from '../middleware/auth.js';
import { createServiceRules, mongoIdParam, publicListRules, updateServiceRules } from '../validators/rules.js';

const router = Router();

router.get('/', optionalAuth, publicListRules, listServices);
router.get('/:id', optionalAuth, mongoIdParam, getService);

// Changes are admin-panel only.
router.post('/', protect, requireAdmin, createServiceRules, createService);
router.put('/:id', protect, requireAdmin, updateServiceRules, updateService);
router.delete('/:id', protect, requireAdmin, mongoIdParam, deleteService);

export default router;
