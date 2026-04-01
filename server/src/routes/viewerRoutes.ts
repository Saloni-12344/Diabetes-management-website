import { Router } from 'express';
import { getViewerSummary } from '../controllers/viewerController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/viewer/summary — viewer sees owner's health data
router.get('/summary', requireAuth, getViewerSummary);

export default router;
