import { Router } from 'express';
import {
  deleteAlert,
  getUnreadCount,
  listAlerts,
  markAlertRead,
  markAllAlertsRead,
} from '../controllers/alertController.js';
import { requireAuth } from '../middleware/auth.js';

const alertRoutes = Router();

alertRoutes.get('/', requireAuth, listAlerts);
alertRoutes.get('/unread-count', requireAuth, getUnreadCount);
alertRoutes.patch('/:id/read', requireAuth, markAlertRead);
alertRoutes.post('/mark-all-read', requireAuth, markAllAlertsRead);
alertRoutes.delete('/:id', requireAuth, deleteAlert);

export { alertRoutes };
