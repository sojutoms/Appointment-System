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
import { protect } from '../middleware/auth.js';
import {
  availableSlotsRules,
  createAppointmentRules,
  listAppointmentsRules,
  mongoIdParam,
  updateAppointmentRules,
} from '../validators/rules.js';

const router = Router();

// Every appointment route requires login. Ownership (client sees only their
// own appointments, admin sees all) is enforced inside the controller.
router.use(protect);

// Declared before '/:id' so these paths aren't treated as IDs.
router.get('/available-slots', availableSlotsRules, getAvailableSlots);
router.get('/stats', getStats);

router.route('/').get(listAppointmentsRules, listAppointments).post(createAppointmentRules, createAppointment);

router
  .route('/:id')
  .get(mongoIdParam, getAppointment)
  .put(updateAppointmentRules, updateAppointment)
  .delete(mongoIdParam, deleteAppointment);

export default router;
