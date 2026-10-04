import { Router } from 'express';
import { createTimeOff, deleteTimeOff, listTimeOff } from '../controllers/timeOffController.js';
import { protect, requireAdmin, requireStaff } from '../middleware/auth.js';
import { SCOPES } from '../utils/tokens.js';
import { createTimeOffRules, listTimeOffRules, mongoIdParam } from '../validators/rules.js';

const router = Router();

// Staff manage their own time off; the admin panel manages anyone's.
router.use(protect, (req, res, next) => (req.scope === SCOPES.STAFF ? requireStaff(req, res, next) : requireAdmin(req, res, next)));

router.get('/', listTimeOffRules, listTimeOff);
router.post('/', createTimeOffRules, createTimeOff);
router.delete('/:id', mongoIdParam, deleteTimeOff);

export default router;
