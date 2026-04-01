import { Router } from 'express';
import { forgotPassword, login, me, register, resetPassword } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter, forgotPasswordLimiter } from '../middleware/rateLimiter.js';

const authRoutes = Router();

authRoutes.post('/register', authLimiter, register);
authRoutes.post('/login', authLimiter, login);
authRoutes.get('/me', requireAuth, me);
authRoutes.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
authRoutes.post('/reset-password', forgotPasswordLimiter, resetPassword);

export { authRoutes };
