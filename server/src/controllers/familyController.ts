import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { sendInviteEmail } from '../lib/email.js';

export async function inviteFamilyMember(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth?.userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

    const { email, role = 'viewer' } = req.body as { email?: string; role?: string };

    if (!email) { res.status(400).json({ message: 'email is required' }); return; }
    if (role !== 'viewer') {
      res.status(400).json({ message: 'Only viewer role can be invited' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();

    // Owner's family (auto-create if missing)
    let family = await prisma.family.findUnique({ where: { ownerId: req.auth.userId } });
    if (!family) {
      family = await prisma.family.create({ data: { ownerId: req.auth.userId } });
    }

    // Can't invite yourself
    const ownerUser = await prisma.user.findUnique({ where: { id: req.auth.userId } });
    if (ownerUser?.email === cleanEmail) {
      res.status(400).json({ message: 'You cannot invite yourself' });
      return;
    }

    // Check if the invitee already has an account
    const memberUser = await prisma.user.findUnique({ where: { email: cleanEmail } });

    if (memberUser) {
      // User exists — create FamilyMember directly
      const relation = await prisma.familyMember.upsert({
        where: { userId: memberUser.id },
        update: { familyId: family.id, role: 'VIEWER', status: 'INVITED' },
        create: { familyId: family.id, userId: memberUser.id, role: 'VIEWER', status: 'INVITED' },
      });

      // Send email (non-blocking — invite is saved regardless of email outcome)
      sendInviteEmail({
        toEmail: cleanEmail,
        ownerName: ownerUser?.name ?? 'Someone',
        isExistingUser: true,
      }).catch((err) => console.error('Email send failed (existing user):', err));

      res.status(200).json({
        message: 'Invite sent',
        invite: {
          id: relation.id,
          familyId: relation.familyId,
          memberUserId: relation.userId,
          role: 'viewer',
          status: 'invited',
          pendingEmail: null,
        },
      });
    } else {
      // User hasn't registered yet — store pending invite by email
      await prisma.pendingInvite.upsert({
        where: { email_familyId: { email: cleanEmail, familyId: family.id } },
        update: { createdAt: new Date() },
        create: { email: cleanEmail, familyId: family.id },
      });

      // Send email (non-blocking — invite is saved regardless of email outcome)
      sendInviteEmail({
        toEmail: cleanEmail,
        ownerName: ownerUser?.name ?? 'Someone',
        isExistingUser: false,
      }).catch((err) => console.error('Email send failed (pending invite):', err));

      res.status(200).json({
        message: `Invite saved. When ${cleanEmail} registers, they will be automatically linked to your family.`,
        invite: {
          id: null,
          familyId: family.id,
          memberUserId: null,
          role: 'viewer',
          status: 'invited',
          pendingEmail: cleanEmail,
        },
      });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('inviteFamilyMember failed:', msg);
    res.status(500).json({ message: msg });
  }
}

export async function acceptInvite(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth?.userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

    const invite = await prisma.familyMember.findUnique({ where: { id: req.params.inviteId as string } });
    if (!invite) { res.status(404).json({ message: 'Invite not found' }); return; }
    if (invite.userId !== req.auth.userId) {
      res.status(403).json({ message: 'You can only accept your own invite' });
      return;
    }

    const updated = await prisma.familyMember.update({
      where: { id: invite.id },
      data: { status: 'ACCEPTED' },
    });

    res.status(200).json({ message: 'Invite accepted', inviteId: updated.id });
  } catch (error) {
    console.error('acceptInvite failed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function listMyFamilyLinks(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth?.userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

    // As owner — list all members in my family
    const ownedFamily = await prisma.family.findUnique({
      where: { ownerId: req.auth.userId },
      include: { members: true },
    });

    // As member — my own membership record
    const myMembership = await prisma.familyMember.findUnique({
      where: { userId: req.auth.userId },
    });

    res.status(200).json({
      asOwner: (ownedFamily?.members ?? []).map((m: { id: string; familyId: string; userId: string; role: string; status: string }) => ({
        id: m.id,
        familyId: m.familyId,
        memberUserId: m.userId,
        role: m.role === 'OWNER' ? 'owner' : 'viewer',
        status: m.status === 'ACCEPTED' ? 'accepted' : 'invited',
      })),
      asMember: myMembership
        ? [{
          id: myMembership.id,
          familyId: myMembership.familyId,
          role: myMembership.role === 'OWNER' ? 'owner' : 'viewer',
          status: myMembership.status === 'ACCEPTED' ? 'accepted' : 'invited',
        }]
        : [],
    });
  } catch (error) {
    console.error('listMyFamilyLinks failed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function removeFamilyMember(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth?.userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

    // Confirm requester owns the family
    const family = await prisma.family.findUnique({ where: { ownerId: req.auth.userId } });
    if (!family) { res.status(403).json({ message: 'Only the family owner can remove members' }); return; }

    const membership = await prisma.familyMember.findFirst({
      where: { familyId: family.id, userId: req.params.memberUserId as string },
    });
    if (!membership) { res.status(404).json({ message: 'Relationship not found' }); return; }

    await prisma.familyMember.delete({ where: { id: membership.id } });
    res.status(200).json({ message: 'Family member removed' });
  } catch (error) {
    console.error('removeFamilyMember failed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
