import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import type { Prisma } from '@prisma/client';
import { signAuthToken } from '../utils/jwt.js';

type SafeUser = {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'viewer';
  diabetesType: string;
  targetGlucoseMin: number;
  targetGlucoseMax: number;
};

function toSafeUser(user: {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'VIEWER';
  diabetesType: string;
  targetGlucoseMin: number;
  targetGlucoseMax: number;
}): SafeUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role === 'OWNER' ? 'owner' : 'viewer',
    diabetesType: user.diabetesType.toLowerCase(),
    targetGlucoseMin: user.targetGlucoseMin,
    targetGlucoseMax: user.targetGlucoseMax,
  };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function toDbRole(role: string): 'OWNER' | 'VIEWER' {
  return role === 'viewer' ? 'VIEWER' : 'OWNER';
}

function toDbDiabetesType(dt?: string): 'TYPE1' | 'TYPE2' | 'GESTATIONAL' | 'OTHER' {
  const map: Record<string, 'TYPE1' | 'TYPE2' | 'GESTATIONAL' | 'OTHER'> = {
    type1: 'TYPE1', type2: 'TYPE2', gestational: 'GESTATIONAL', other: 'OTHER',
  };
  return map[dt?.toLowerCase() ?? ''] ?? 'TYPE1';
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, password, role, diabetesType, targetGlucoseMin, targetGlucoseMax } = req.body as {
      name?: string; email?: string; password?: string; role?: string;
      diabetesType?: string; targetGlucoseMin?: number; targetGlucoseMax?: number;
    };

    if (!name || !email || !password) {
      res.status(400).json({ message: 'name, email, and password are required' });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ message: 'password must be at least 8 characters' });
      return;
    }
    const normalizedEmail = email.toLowerCase().trim();
    if (!isValidEmail(normalizedEmail)) {
      res.status(400).json({ message: 'Invalid email format' });
      return;
    }

    const safeRole = role === 'viewer' ? 'viewer' : 'owner';
    const dbRole = toDbRole(safeRole);

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      res.status(409).json({ message: 'Email already in use' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Check if there's a pending invite for this email — if so, register as VIEWER
    const pendingInvite = await prisma.pendingInvite.findFirst({
      where: { email: normalizedEmail },
    });
    const effectiveRole: 'OWNER' | 'VIEWER' = pendingInvite ? 'VIEWER' : dbRole;

    // Create user + family (for owners) in one atomic transaction
    const user = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const newUser = await tx.user.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          passwordHash,
          role: effectiveRole,
          diabetesType: toDbDiabetesType(diabetesType),
          targetGlucoseMin: targetGlucoseMin ?? 70,
          targetGlucoseMax: targetGlucoseMax ?? 180,
        },
      });

      if (pendingInvite) {
        // Auto-link to the family they were invited to
        await tx.familyMember.create({
          data: {
            familyId: pendingInvite.familyId,
            userId: newUser.id,
            role: 'VIEWER',
            status: 'INVITED',
          },
        });
        // Remove the pending invite
        await tx.pendingInvite.delete({ where: { id: pendingInvite.id } });
      } else if (effectiveRole === 'OWNER') {
        // Owners automatically get their own Family so food library has a home
        await tx.family.create({ data: { ownerId: newUser.id } });
      }

      return newUser;
    });

    // Always sign JWT from the DB-persisted role, not the request body.
    // This ensures invited users who registered as "owner" still get a VIEWER token.
    const token = signAuthToken({
      userId: user.id,
      email: user.email,
      role: user.role === 'OWNER' ? 'owner' : 'viewer',
    });
    res.status(201).json({ token, user: toSafeUser(user) });
  } catch (error) {
    console.error('register failed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ message: 'email and password are required' });
      return;
    }
    const normalizedEmail = email.toLowerCase().trim();
    if (!isValidEmail(normalizedEmail)) {
      res.status(400).json({ message: 'Invalid email format' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    const role: 'owner' | 'viewer' = user.role === 'OWNER' ? 'owner' : 'viewer';
    const token = signAuthToken({ userId: user.id, email: user.email, role });
    res.status(200).json({ token, user: toSafeUser(user) });
  } catch (error) {
    console.error('login failed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function me(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth?.userId) { res.status(401).json({ message: 'Unauthorized' }); return; }
    const user = await prisma.user.findUnique({ where: { id: req.auth.userId } });
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }
    res.status(200).json({ user: toSafeUser(user) });
  } catch (error) {
    console.error('me failed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body as { email?: string };
    if (!email) { res.status(400).json({ message: 'email is required' }); return; }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user) {
      res.status(200).json({ message: 'If that email exists, a reset code has been generated.' });
      return;
    }

    const resetToken = crypto.randomInt(100000, 999999).toString();
    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.user.update({ where: { id: user.id }, data: { resetToken, resetTokenExpiry } });

    res.status(200).json({ message: 'Reset code generated.', resetToken });
  } catch (error) {
    console.error('forgotPassword failed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email, resetToken, newPassword } = req.body as {
      email?: string; resetToken?: string; newPassword?: string;
    };

    if (!email || !resetToken || !newPassword) {
      res.status(400).json({ message: 'email, resetToken, and newPassword are required' });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ message: 'newPassword must be at least 8 characters' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user || !user.resetToken || !user.resetTokenExpiry) {
      res.status(400).json({ message: 'Invalid or expired reset code' });
      return;
    }
    if (user.resetToken !== resetToken) {
      res.status(400).json({ message: 'Invalid reset code' });
      return;
    }
    if (new Date() > user.resetTokenExpiry) {
      res.status(400).json({ message: 'Reset code has expired. Please request a new one.' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetToken: null, resetTokenExpiry: null },
    });
    res.status(200).json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (error) {
    console.error('resetPassword failed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
