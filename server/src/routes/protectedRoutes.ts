import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';

const protectedRoutes = Router();

protectedRoutes.get('/me', requireAuth, (req, res) => {
  res.status(200).json({ auth: req.auth });
});

protectedRoutes.get('/owner-only', requireAuth, requireRole('owner'), (_req, res) => {
  res.status(200).json({ message: 'Owner access granted' });
});

export { protectedRoutes };
