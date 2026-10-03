import { Router } from 'express';
import {
  deleteUser,
  getProfile,
  listUsers,
  updateProfile,
  updateUserRole,
} from '../controllers/userController.js';
import { authorize, protect } from '../middleware/auth.js';
import { mongoIdParam, roleRules, updateProfileRules } from '../validators/rules.js';

const router = Router();

router.use(protect);

router.route('/me').get(getProfile).put(updateProfileRules, updateProfile);

router.get('/', authorize('admin'), listUsers);
router.patch('/:id/role', authorize('admin'), roleRules, updateUserRole);
router.delete('/:id', authorize('admin'), mongoIdParam, deleteUser);

export default router;
