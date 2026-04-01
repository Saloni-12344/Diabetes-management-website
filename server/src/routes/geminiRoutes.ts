import { Router } from 'express';
import { analyzeFoodPhoto } from '../controllers/geminiController.js';
import { requireAuth } from '../middleware/auth.js';

const geminiRoutes = Router();

// POST /api/gemini/analyze-food
// Body: { imageBase64: string, mimeType: string }
geminiRoutes.post('/analyze-food', requireAuth, analyzeFoodPhoto);

export { geminiRoutes };
