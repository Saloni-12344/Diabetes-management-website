import type { Request, Response } from 'express';
import { GlucoseLog } from '../models/GlucoseLog.js';
import { fromFilter } from '../utils/dateFilter.js';

export async function createGlucoseLog(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth?.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { value, unit = 'mg/dL', loggedAt, notes } = req.body as {
      value?: number;
      unit?: 'mg/dL' | 'mmol/L';
      loggedAt?: string;
      notes?: string;
    };

    if (typeof value !== 'number' || value < 0) {
      res.status(400).json({ message: 'value must be non-negative number' });
      return;
    }

    if (!['mg/dL', 'mmol/L'].includes(unit)) {
      res.status(400).json({ message: 'unit must be mg/dL or mmol/L' });
      return;
    }

    const log = await GlucoseLog.create({
      userId: req.auth.userId,
      value,
      unit,
      loggedAt: loggedAt ? new Date(loggedAt) : new Date(),
      notes,
      source: 'manual',
    });

    res.status(201).json({ log });
  } catch (error) {
    console.error('createGlucoseLog failed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function listGlucoseLogs(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth?.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const query: Record<string, unknown> = { userId: req.auth.userId };
    const from = fromFilter(String(req.query.filter || ''));
    if (from) query.loggedAt = { $gte: from };

    const logs = await GlucoseLog.find(query).sort({ loggedAt: -1 }).limit(200);
    res.status(200).json({ logs });
  } catch (error) {
    console.error('listGlucoseLogs failed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function deleteGlucoseLog(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth?.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const deleted = await GlucoseLog.findOneAndDelete({
      _id: req.params.id,
      userId: req.auth.userId,
    });

    if (!deleted) {
      res.status(404).json({ message: 'Log not found' });
      return;
    }

    res.status(200).json({ message: 'Deleted' });
  } catch (error) {
    console.error('deleteGlucoseLog failed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
