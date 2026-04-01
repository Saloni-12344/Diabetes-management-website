import type { Request, Response } from 'express';
import { createAlert } from './alertController.js';
import { prisma } from '../lib/prisma.js';
import { emitToUser } from '../lib/socket.js';
import { fromFilter } from '../utils/dateFilter.js';

export async function createGlucoseLog(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth?.userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

    const { value, unit = 'mg/dL', loggedAt, notes } = req.body as {
      value?: number; unit?: string; loggedAt?: string; notes?: string;
    };

    if (typeof value !== 'number' || value < 0) {
      res.status(400).json({ message: 'value must be non-negative number' });
      return;
    }

    const dbUnit = unit === 'mmol/L' ? 'MMOL_L' : 'MG_DL';

    const log = await prisma.glucoseLog.create({
      data: {
        userId: req.auth.userId,
        value,
        unit: dbUnit,
        loggedAt: loggedAt ? new Date(loggedAt) : new Date(),
        notes,
        source: 'manual',
      },
    });

    // Fire critical glucose alert if value is dangerously out of range
    if (value < 54 || value > 250) {
      void createAlert({
        userId: req.auth.userId,
        type: 'CRITICAL_GLUCOSE',
        message: value < 54
          ? `Critical low glucose: ${value} mg/dL — act immediately`
          : `Critical high glucose: ${value} mg/dL — check ketones`,
        relatedLogId: log.id,
      });
    }

    // Emit real-time event to user's family room
    emitToUser(req.auth.userId, 'glucose:new', { log: serialiseGlucoseLog(log) });

    res.status(201).json({ log: serialiseGlucoseLog(log) });
  } catch (error) {
    console.error('createGlucoseLog failed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function listGlucoseLogs(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth?.userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

    const from = fromFilter(String(req.query.filter || ''));

    const logs = await prisma.glucoseLog.findMany({
      where: {
        userId: req.auth.userId,
        ...(from ? { loggedAt: { gte: from } } : {}),
      },
      orderBy: { loggedAt: 'desc' },
      take: 200,
    });

    res.status(200).json({ logs: logs.map(serialiseGlucoseLog) });
  } catch (error) {
    console.error('listGlucoseLogs failed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function deleteGlucoseLog(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth?.userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

    const id = req.params.id as string;
    if (!id) { res.status(400).json({ message: 'Missing log id' }); return; }

    const result = await prisma.glucoseLog.deleteMany({
      where: { id, userId: req.auth.userId },
    });

    if (result.count === 0) {
      res.status(404).json({ message: 'Log not found or already deleted' });
      return;
    }

    res.status(200).json({ message: 'Deleted' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('deleteGlucoseLog failed:', msg);
    res.status(500).json({ message: msg });
  }
}

// ── Serialiser — maps DB enum to API string ──────────────────────────────────
function serialiseGlucoseLog(log: {
  id: string; userId: string; value: number; unit: string;
  loggedAt: Date; notes: string | null; source: string; createdAt: Date;
}) {
  return {
    ...log,
    unit: log.unit === 'MMOL_L' ? 'mmol/L' : 'mg/dL',
    loggedAt: log.loggedAt.toISOString(),
    createdAt: log.createdAt.toISOString(),
  };
}
