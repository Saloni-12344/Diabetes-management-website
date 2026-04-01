import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

// Helper — look up the Family the current user belongs to (either as owner or member).
// If the user is an OWNER with no family yet, auto-creates one so Mom's Kitchen works
// immediately after registration without a separate setup step.
async function getUserFamilyId(userId: string): Promise<string | null> {
  // Check if owner already has a family
  const ownedFamily = await prisma.family.findUnique({ where: { ownerId: userId } });
  if (ownedFamily) return ownedFamily.id;

  // Check if accepted family member
  const membership = await prisma.familyMember.findUnique({ where: { userId } });
  if (membership?.status === 'ACCEPTED') return membership.familyId;

  // Auto-create family for OWNER users who registered before family was provisioned
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user?.role === 'OWNER') {
    const newFamily = await prisma.family.create({ data: { ownerId: userId } });
    return newFamily.id;
  }

  return null;
}

export async function createFoodItem(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth?.userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

    const { dishName, gramsPerServing, calories, carbs, protein, fat, isCooked, photoUrl } = req.body as {
      dishName?: string; gramsPerServing?: number; calories?: number;
      carbs?: number; protein?: number; fat?: number; isCooked?: boolean; photoUrl?: string;
    };

    if (!dishName || typeof gramsPerServing !== 'number' || gramsPerServing <= 0) {
      res.status(400).json({ message: 'dishName and positive gramsPerServing are required' });
      return;
    }
    if (typeof calories !== 'number' || typeof carbs !== 'number' ||
        typeof protein !== 'number' || typeof fat !== 'number') {
      res.status(400).json({ message: 'calories, carbs, protein, fat are required numbers' });
      return;
    }

    const familyId = await getUserFamilyId(req.auth.userId);
    if (!familyId) {
      res.status(400).json({ message: 'You must belong to a family to add food items' });
      return;
    }

    const item = await prisma.foodLibrary.create({
      data: {
        familyId,
        createdByUserId: req.auth.userId,
        dishName: dishName.trim(),
        gramsPerServing,
        calories,
        carbs,
        protein,
        fat,
        isCooked: isCooked ?? true,
        photoUrl,
        isConfirmed: true,
      },
    });

    res.status(201).json({ item: serialiseFoodItem(item) });
  } catch (error) {
    console.error('createFoodItem failed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function listFoodLibrary(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth?.userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

    const familyId = await getUserFamilyId(req.auth.userId);
    if (!familyId) {
      res.status(200).json({ items: [] });
      return;
    }

    const items = await prisma.foodLibrary.findMany({
      where: { familyId },
      orderBy: { dishName: 'asc' },
    });

    res.status(200).json({ items: items.map(serialiseFoodItem) });
  } catch (error) {
    console.error('listFoodLibrary failed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function updateFoodItem(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth?.userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

    const familyId = await getUserFamilyId(req.auth.userId);
    if (!familyId) { res.status(403).json({ message: 'No family access' }); return; }

    const id = req.params.id as string;
    const existing = await prisma.foodLibrary.findFirst({
      where: { id, familyId },
    });
    if (!existing) { res.status(404).json({ message: 'Item not found' }); return; }

    const { dishName, gramsPerServing, calories, carbs, protein, fat, isCooked, photoUrl } = req.body as {
      dishName?: string; gramsPerServing?: number; calories?: number;
      carbs?: number; protein?: number; fat?: number; isCooked?: boolean; photoUrl?: string;
    };

    const item = await prisma.foodLibrary.update({
      where: { id },
      data: {
        ...(dishName !== undefined ? { dishName: dishName.trim() } : {}),
        ...(gramsPerServing !== undefined ? { gramsPerServing } : {}),
        ...(calories !== undefined ? { calories } : {}),
        ...(carbs !== undefined ? { carbs } : {}),
        ...(protein !== undefined ? { protein } : {}),
        ...(fat !== undefined ? { fat } : {}),
        ...(isCooked !== undefined ? { isCooked } : {}),
        ...(photoUrl !== undefined ? { photoUrl } : {}),
      },
    });

    res.status(200).json({ item: serialiseFoodItem(item) });
  } catch (error) {
    console.error('updateFoodItem failed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function deleteFoodItem(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth?.userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

    const familyId = await getUserFamilyId(req.auth.userId);
    if (!familyId) { res.status(403).json({ message: 'No family access' }); return; }

    const id = req.params.id as string;
    const existing = await prisma.foodLibrary.findFirst({
      where: { id, familyId },
    });
    if (!existing) { res.status(404).json({ message: 'Item not found' }); return; }

    await prisma.foodLibrary.delete({ where: { id } });
    res.status(200).json({ message: 'Deleted' });
  } catch (error) {
    console.error('deleteFoodItem failed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

function serialiseFoodItem(item: {
  id: string; familyId: string; createdByUserId: string; dishName: string;
  gramsPerServing: number; calories: number; carbs: number; protein: number;
  fat: number; isCooked: boolean; photoUrl: string | null; isConfirmed: boolean;
  createdAt: Date; updatedAt: Date;
}) {
  return {
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}
