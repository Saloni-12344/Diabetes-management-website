import type { Request, Response } from 'express';
import { MealLog } from '../models/MealLog.js';
import { fromFilter } from '../utils/dateFilter.js';

export async function createMealLog(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth?.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const {
      mealName,
      grams,
      calories,
      carbs,
      protein,
      fat,
      isCooked,
      loggedAt,
      notes,
      source,
      foodLibraryId,
    } = req.body as {
      mealName?: string;
      grams?: number;
      calories?: number;
      carbs?: number;
      protein?: number;
      fat?: number;
      isCooked?: boolean;
      loggedAt?: string;
      notes?: string;
      source?: 'manual' | 'ai' | 'library';
      foodLibraryId?: string;
    };

    if (!mealName || typeof grams !== 'number' || grams <= 0) {
      res.status(400).json({ message: 'mealName and positive grams are required' });
      return;
    }

    if (
      typeof calories !== 'number' ||
      typeof carbs !== 'number' ||
      typeof protein !== 'number' ||
      typeof fat !== 'number'
    ) {
      res.status(400).json({ message: 'calories, carbs, protein, fat are required numbers' });
      return;
    }

    if (source && !['manual', 'ai', 'library'].includes(source)) {
      res.status(400).json({ message: 'source must be manual, ai, or library' });
      return;
    }

    const log = await MealLog.create({
      userId: req.auth.userId,
      mealName: mealName.trim(),
      foodLibraryId,
      grams,
      calories,
      carbs,
      protein,
      fat,
      isCooked: isCooked ?? true,
      loggedAt: loggedAt ? new Date(loggedAt) : new Date(),
      notes,
      source: source ?? 'manual',
    });

    const highCarbLowProtein = carbs > 50 && protein < 10;

    res.status(201).json({
      log,
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
    if (!req.auth?.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const query: Record<string, unknown> = { userId: req.auth.userId };
    const from = fromFilter(String(req.query.filter || ''));
    if (from) query.loggedAt = { $gte: from };

    const logs = await MealLog.find(query).sort({ loggedAt: -1 }).limit(200);
    res.status(200).json({ logs });
  } catch (error) {
    console.error('listMealLogs failed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function deleteMealLog(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth?.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const deleted = await MealLog.findOneAndDelete({
      _id: req.params.id,
      userId: req.auth.userId,
    });

    if (!deleted) {
      res.status(404).json({ message: 'Log not found' });
      return;
    }

    res.status(200).json({ message: 'Deleted' });
  } catch (error) {
    console.error('deleteMealLog failed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
