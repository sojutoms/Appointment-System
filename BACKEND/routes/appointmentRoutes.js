import { Router } from 'express';
import {
  createAppointment,
  deleteAppointment,
  getAppointment,
  getAvailableSlots,
  getStats,
  listAppointments,
  updateAppointment,
} from '../controllers/appointmentController.js';
import { protect, requireScope } from '../middleware/auth.js';
import { SCOPES } from '../utils/tokens.js';
import {
  availableSlotsRules,
  createAppointmentRules,
  listAppointmentsRules,
  mongoIdParam,
  updateAppointmentRules,
} from '../validators/rules.js';

const router = Router();

// Every appointment route requires login. Ownership (client sees only their
// own appointments, admin panel sees all) is enforced inside the controller.
// Staff use their own portal routes (/api/staff-portal) instead of these.
router.use(protect);

const clientOrAdmin = requireScope(SCOPES.USER, SCOPES.ADMIN);

// Declared before '/:id' so these paths aren't treated as IDs.
router.get('/available-slots', clientOrAdmin, availableSlotsRules, getAvailableSlots);
router.get('/stats', clientOrAdmin, getStats);

router
  .route('/')
  .get(clientOrAdmin, listAppointmentsRules, listAppointments)
  // Only client sessions book appointments.
  .post(requireScope(SCOPES.USER), createAppointmentRules, createAppointment);

router
  .route('/:id')
  .get(clientOrAdmin, mongoIdParam, getAppointment)
  .put(clientOrAdmin, updateAppointmentRules, updateAppointment)
  .delete(clientOrAdmin, mongoIdParam, deleteAppointment);

export default router;
