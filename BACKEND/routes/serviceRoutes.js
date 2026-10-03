import { Router } from 'express';
import {
  createService,
  deleteService,
  getService,
  listServices,
  updateService,
} from '../controllers/serviceController.js';
import { authorize, optionalAuth, protect } from '../middleware/auth.js';
import { createServiceRules, mongoIdParam, updateServiceRules } from '../validators/rules.js';

const router = Router();

router.get('/', optionalAuth, listServices);
router.get('/:id', mongoIdParam, getService);

router.post('/', protect, authorize('admin'), createServiceRules, createService);
router.put('/:id', protect, authorize('admin'), updateServiceRules, updateService);
router.delete('/:id', protect, authorize('admin'), mongoIdParam, deleteService);

export default router;
