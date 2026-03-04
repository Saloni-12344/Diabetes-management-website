import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
import { User } from '../models/User.js';
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
  _id: unknown;
  name: string;
  email: string;
  role: 'owner' | 'viewer';
  diabetesType: string;
  targetGlucoseMin: number;
  targetGlucoseMax: number;
}): SafeUser {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    diabetesType: user.diabetesType,
    targetGlucoseMin: user.targetGlucoseMin,
    targetGlucoseMax: user.targetGlucoseMax,
  };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, password, role, diabetesType, targetGlucoseMin, targetGlucoseMax } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      role?: 'owner' | 'viewer';
      diabetesType?: string;
      targetGlucoseMin?: number;
      targetGlucoseMax?: number;
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

    const safeRole: 'owner' | 'viewer' = role ?? 'owner';
    if (!['owner', 'viewer'].includes(safeRole)) {
      res.status(400).json({ message: 'role must be owner or viewer' });
      return;
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      res.status(409).json({ message: 'Email already in use' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: safeRole,
      diabetesType,
      targetGlucoseMin: targetGlucoseMin ?? 70,
      targetGlucoseMax: targetGlucoseMax ?? 180,
    });

    const token = signAuthToken({
      userId: String(user._id),
      email: user.email,
      role: user.role,
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

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    const token = signAuthToken({
      userId: String(user._id),
      email: user.email,
      role: user.role,
    });

    res.status(200).json({ token, user: toSafeUser(user) });
  } catch (error) {
    console.error('login failed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function me(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth?.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const user = await User.findById(req.auth.userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.status(200).json({ user: toSafeUser(user) });
  } catch (error) {
    console.error('me failed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
