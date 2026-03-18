import type { Request, Response } from 'express';
import { FamilyMember } from '../models/FamilyMember.js';
import { User } from '../models/User.js';

export async function inviteFamilyMember(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth?.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { email, role = 'viewer' } = req.body as { email?: string; role?: 'viewer' | 'owner' };

    if (!email) {
      res.status(400).json({ message: 'email is required' });
      return;
    }

    if (role !== 'viewer') {
      res.status(400).json({ message: 'Only viewer role can be invited' });
      return;
    }

    const memberUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (!memberUser) {
      res.status(404).json({ message: 'User not found for this email' });
      return;
    }

    if (String(memberUser._id) === req.auth.userId) {
      res.status(400).json({ message: 'You cannot invite yourself' });
      return;
    }

    const relation = await FamilyMember.findOneAndUpdate(
      { ownerUserId: req.auth.userId, memberUserId: memberUser._id },
      {
        ownerUserId: req.auth.userId,
        memberUserId: memberUser._id,
        role: 'viewer',
        invitedByUserId: req.auth.userId,
        status: 'invited',
      },
      { new: true, upsert: true },
    );

    res.status(200).json({
      message: 'Invite sent',
      invite: {
        id: String(relation._id),
        ownerUserId: String(relation.ownerUserId),
        memberUserId: String(relation.memberUserId),
        role: relation.role,
        status: relation.status,
      },
    });
  } catch (error) {
    console.error('inviteFamilyMember failed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function acceptInvite(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth?.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { inviteId } = req.params;

    const invite = await FamilyMember.findById(inviteId);
    if (!invite) {
      res.status(404).json({ message: 'Invite not found' });
      return;
    }

    if (String(invite.memberUserId) !== req.auth.userId) {
      res.status(403).json({ message: 'You can only accept your own invite' });
      return;
    }

    invite.status = 'accepted';
    await invite.save();

    res.status(200).json({ message: 'Invite accepted', inviteId: String(invite._id) });
  } catch (error) {
    console.error('acceptInvite failed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function listMyFamilyLinks(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth?.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const asOwner = await FamilyMember.find({ ownerUserId: req.auth.userId });
    const asMember = await FamilyMember.find({ memberUserId: req.auth.userId });

    res.status(200).json({
      asOwner: asOwner.map((x) => ({
        id: String(x._id),
        ownerUserId: String(x.ownerUserId),
        memberUserId: String(x.memberUserId),
        role: x.role,
        status: x.status,
      })),
      asMember: asMember.map((x) => ({
        id: String(x._id),
        ownerUserId: String(x.ownerUserId),
        memberUserId: String(x.memberUserId),
        role: x.role,
        status: x.status,
      })),
    });
  } catch (error) {
    console.error('listMyFamilyLinks failed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function removeFamilyMember(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth?.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { memberUserId } = req.params;

    const deleted = await FamilyMember.findOneAndDelete({
      ownerUserId: req.auth.userId,
      memberUserId,
    });

    if (!deleted) {
      res.status(404).json({ message: 'Relationship not found' });
      return;
    }

    res.status(200).json({ message: 'Family member removed' });
  } catch (error) {
    console.error('removeFamilyMember failed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
