import { Router } from 'express';
import { createMealLog, deleteMealLog, listMealLogs } from '../controllers/mealController.js';
import { requireAuth } from '../middleware/auth.js';

const mealRoutes = Router();

mealRoutes.post('/', requireAuth, createMealLog);
mealRoutes.get('/', requireAuth, listMealLogs);
mealRoutes.delete('/:id', requireAuth, deleteMealLog);

export { mealRoutes };
