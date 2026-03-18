import { Router } from 'express';
import {
  acceptInvite,
  inviteFamilyMember,
  listMyFamilyLinks,
  removeFamilyMember,
} from '../controllers/familyController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const familyRoutes = Router();

familyRoutes.post('/invite', requireAuth, requireRole('owner'), inviteFamilyMember);
familyRoutes.post('/accept/:inviteId', requireAuth, acceptInvite);
familyRoutes.get('/mine', requireAuth, listMyFamilyLinks);
familyRoutes.delete('/member/:memberUserId', requireAuth, requireRole('owner'), removeFamilyMember);

export { familyRoutes };
