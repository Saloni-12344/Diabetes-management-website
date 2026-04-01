import type { Request, Response } from 'express';
import { createAlert } from './alertController.js';
import { prisma } from '../lib/prisma.js';
import { emitToUser } from '../lib/socket.js';
import { fromFilter } from '../utils/dateFilter.js';

export async function createMealLog(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth?.userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

    const { mealName, grams, calories, carbs, protein, fat, isCooked, loggedAt, notes, source, foodLibraryId } = req.body as {
      mealName?: string; grams?: number; calories?: number; carbs?: number;
      protein?: number; fat?: number; isCooked?: boolean; loggedAt?: string;
      notes?: string; source?: string; foodLibraryId?: string;
    };

    if (!mealName || typeof grams !== 'number' || grams <= 0) {
      res.status(400).json({ message: 'mealName and positive grams are required' });
      return;
    }
    if (typeof calories !== 'number' || typeof carbs !== 'number' ||
        typeof protein !== 'number' || typeof fat !== 'number') {
      res.status(400).json({ message: 'calories, carbs, protein, fat are required numbers' });
      return;
    }

    const dbSource = source === 'ai' ? 'AI' : source === 'library' ? 'LIBRARY' : 'MANUAL';

    // Nutrition values are SNAPSHOTTED here — never looked up from food library again
    const log = await prisma.mealLog.create({
      data: {
        userId: req.auth.userId,
        mealName: mealName.trim(),
        grams,
        calories,
        carbs,
        protein,
        fat,
        isCooked: isCooked ?? true,
        loggedAt: loggedAt ? new Date(loggedAt) : new Date(),
        notes,
        source: dbSource,
        foodLibraryId: foodLibraryId ?? null,
      },
    });

    const highCarbLowProtein = carbs > 50 && protein < 10;

    // Persist alert to DB (fire-and-forget, non-blocking)
    if (highCarbLowProtein) {
      void createAlert({
        userId: req.auth.userId,
        type: 'HIGH_CARB_LOW_PROTEIN',
        message: `High carb (${carbs}g) and low protein (${protein}g) meal: ${mealName.trim()}`,
        relatedLogId: log.id,
      });
    }

    emitToUser(req.auth.userId, 'meal:new', { log: serialiseMealLog(log) });

    res.status(201).json({
      log: serialiseMealLog(log),
      alerts: highCarbLowProtein
        ? [{ type: 'warning', message: 'High carb + low protein meal detected' }]
        : [],
    });
  } catch (error) {
    console.error('createMealLog failed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function listMealLogs(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth?.userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

    const from = fromFilter(String(req.query.filter || ''));

    const logs = await prisma.mealLog.findMany({
      where: {
        userId: req.auth.userId,
        ...(from ? { loggedAt: { gte: from } } : {}),
      },
      orderBy: { loggedAt: 'desc' },
      take: 200,
    });

    res.status(200).json({ logs: logs.map(serialiseMealLog) });
  } catch (error) {
    console.error('listMealLogs failed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function deleteMealLog(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth?.userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

    const id = req.params.id as string;
    if (!id) { res.status(400).json({ message: 'Missing log id' }); return; }

    const result = await prisma.mealLog.deleteMany({
      where: { id, userId: req.auth.userId },
    });

    if (result.count === 0) {
      res.status(404).json({ message: 'Log not found or already deleted' });
      return;
    }

    res.status(200).json({ message: 'Deleted' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('deleteMealLog failed:', msg);
    res.status(500).json({ message: msg });
  }
}

function serialiseMealLog(log: {
  id: string; userId: string; mealName: string; grams: number;
  calories: number; carbs: number; protein: number; fat: number;
  isCooked: boolean; source: string; loggedAt: Date;
  notes: string | null; foodLibraryId: string | null; createdAt: Date;
}) {
  return {
    ...log,
    source: log.source === 'AI' ? 'ai' : log.source === 'LIBRARY' ? 'library' : 'manual',
    loggedAt: log.loggedAt.toISOString(),
    createdAt: log.createdAt.toISOString(),
  };
}
