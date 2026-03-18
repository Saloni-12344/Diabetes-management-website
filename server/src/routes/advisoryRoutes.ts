import { Router } from 'express';
import { calculateAdvisory, listAdvisoryHistory } from '../controllers/advisoryController.js';
import { requireAuth } from '../middleware/auth.js';

const advisoryRoutes = Router();

advisoryRoutes.post('/calculate', requireAuth, calculateAdvisory);
advisoryRoutes.get('/history', requireAuth, listAdvisoryHistory);

export { advisoryRoutes };
