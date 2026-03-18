import { Router } from 'express';
import {
  createFoodItem,
  deleteFoodItem,
  listFoodLibrary,
  updateFoodItem,
} from '../controllers/foodLibraryController.js';
import { requireAuth } from '../middleware/auth.js';

const foodLibraryRoutes = Router();

foodLibraryRoutes.post('/', requireAuth, createFoodItem);
foodLibraryRoutes.get('/', requireAuth, listFoodLibrary);
foodLibraryRoutes.put('/:id', requireAuth, updateFoodItem);
foodLibraryRoutes.delete('/:id', requireAuth, deleteFoodItem);

export { foodLibraryRoutes };
