import { Router } from 'express';
import { listHistory } from '../controllers/historyController.js';
import { requireAuth } from '../middleware/auth.js';

const historyRoutes = Router();

historyRoutes.get('/', requireAuth, listHistory);

export { historyRoutes };
