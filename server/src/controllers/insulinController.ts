import type { Request, Response } from 'express';
import { InsulinLog } from '../models/InsulinLog.js';
import { fromFilter } from '../utils/dateFilter.js';

export async function createInsulinLog(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth?.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { dose, insulinType, loggedAt, notes, idempotencyKey } = req.body as {
      dose?: number;
      insulinType?: 'fast' | 'slow';
      loggedAt?: string;
      notes?: string;
      idempotencyKey?: string;
    };

    if (typeof dose !== 'number' || dose < 0) {
      res.status(400).json({ message: 'dose must be non-negative number' });
      return;
    }

    if (!insulinType || !['fast', 'slow'].includes(insulinType)) {
      res.status(400).json({ message: 'insulinType must be fast or slow' });
      return;
    }

    if (idempotencyKey) {
      const existing = await InsulinLog.findOne({
        userId: req.auth.userId,
        idempotencyKey,
      });

      if (existing) {
        res.status(200).json({ log: existing, duplicate: true });
        return;
      }
    }

    const log = await InsulinLog.create({
      userId: req.auth.userId,
      dose,
      insulinType,
      loggedAt: loggedAt ? new Date(loggedAt) : new Date(),
      notes,
      idempotencyKey,
      source: 'manual',
    });

    res.status(201).json({ log, duplicate: false });
  } catch (error) {
    console.error('createInsulinLog failed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function listInsulinLogs(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth?.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const query: Record<string, unknown> = { userId: req.auth.userId };
    const from = fromFilter(String(req.query.filter || ''));
    if (from) query.loggedAt = { $gte: from };

    const logs = await InsulinLog.find(query).sort({ loggedAt: -1 }).limit(200);
    res.status(200).json({ logs });
  } catch (error) {
    console.error('listInsulinLogs failed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function deleteInsulinLog(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth?.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const deleted = await InsulinLog.findOneAndDelete({
      _id: req.params.id,
      userId: req.auth.userId,
    });

    if (!deleted) {
      res.status(404).json({ message: 'Log not found' });
      return;
    }

    res.status(200).json({ message: 'Deleted' });
  } catch (error) {
    console.error('deleteInsulinLog failed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
