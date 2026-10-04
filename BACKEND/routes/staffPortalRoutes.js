import { Router } from 'express';
import {
  getDay,
  getMyAppointment,
  getMyStaffProfile,
  getSummary,
  listMyAppointments,
  updateMyAppointment,
} from '../controllers/staffPortalController.js';
import { protect, requireStaff } from '../middleware/auth.js';
import { mongoIdParam, staffAppointmentUpdateRules, staffDayRules, staffListRules } from '../validators/rules.js';

const router = Router();

// Staff sessions only. requireStaff attaches the staff record, and every
// controller filters by it, so staff only ever see their own appointments.
router.use(protect, requireStaff);

router.get('/me', getMyStaffProfile);
router.get('/summary', getSummary);
router.get('/day', staffDayRules, getDay);
router.get('/appointments', staffListRules, listMyAppointments);
router.get('/appointments/:id', mongoIdParam, getMyAppointment);
router.patch('/appointments/:id', staffAppointmentUpdateRules, updateMyAppointment);

export default router;
