import { Router } from 'express';
import {
  createGlucoseLog,
  deleteGlucoseLog,
  listGlucoseLogs,
} from '../controllers/glucoseController.js';
import { requireAuth } from '../middleware/auth.js';

const glucoseRoutes = Router();

glucoseRoutes.post('/', requireAuth, createGlucoseLog);
glucoseRoutes.get('/', requireAuth, listGlucoseLogs);
glucoseRoutes.delete('/:id', requireAuth, deleteGlucoseLog);

export { glucoseRoutes };
