import { Router } from 'express';
import {
  createInsulinLog,
  deleteInsulinLog,
  listInsulinLogs,
} from '../controllers/insulinController.js';
import { requireAuth } from '../middleware/auth.js';

const insulinRoutes = Router();

insulinRoutes.post('/', requireAuth, createInsulinLog);
insulinRoutes.get('/', requireAuth, listInsulinLogs);
insulinRoutes.delete('/:id', requireAuth, deleteInsulinLog);

export { insulinRoutes };
