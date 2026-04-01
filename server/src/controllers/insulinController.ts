import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { emitToUser } from '../lib/socket.js';
import { fromFilter } from '../utils/dateFilter.js';

export async function createInsulinLog(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth?.userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

    const { dose, insulinType, loggedAt, notes, idempotencyKey } = req.body as {
      dose?: number; insulinType?: string; loggedAt?: string;
      notes?: string; idempotencyKey?: string;
    };

    if (typeof dose !== 'number' || dose < 0) {
      res.status(400).json({ message: 'dose must be non-negative number' });
      return;
    }
    if (!insulinType || !['fast', 'slow'].includes(insulinType)) {
      res.status(400).json({ message: 'insulinType must be fast or slow' });
      return;
    }

    const dbType = insulinType === 'fast' ? 'FAST' : 'SLOW';

    // Idempotency check
    if (idempotencyKey) {
      const existing = await prisma.insulinLog.findFirst({
        where: { userId: req.auth.userId, idempotencyKey },
      });
      if (existing) {
        res.status(200).json({ log: serialiseInsulinLog(existing), duplicate: true });
        return;
      }
    }

    const log = await prisma.insulinLog.create({
      data: {
        userId: req.auth.userId,
        dose,
        insulinType: dbType,
        loggedAt: loggedAt ? new Date(loggedAt) : new Date(),
        notes,
        idempotencyKey,
        source: 'manual',
      },
    });

    emitToUser(req.auth.userId, 'insulin:new', { log: serialiseInsulinLog(log) });
    res.status(201).json({ log: serialiseInsulinLog(log), duplicate: false });
  } catch (error) {
    console.error('createInsulinLog failed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function listInsulinLogs(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth?.userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

    const from = fromFilter(String(req.query.filter || ''));

    const logs = await prisma.insulinLog.findMany({
      where: {
        userId: req.auth.userId,
        ...(from ? { loggedAt: { gte: from } } : {}),
      },
      orderBy: { loggedAt: 'desc' },
      take: 200,
    });

    res.status(200).json({ logs: logs.map(serialiseInsulinLog) });
  } catch (error) {
    console.error('listInsulinLogs failed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function deleteInsulinLog(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth?.userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

    const id = req.params.id as string;
    if (!id) { res.status(400).json({ message: 'Missing log id' }); return; }

    const result = await prisma.insulinLog.deleteMany({
      where: { id, userId: req.auth.userId },
    });

    if (result.count === 0) {
      res.status(404).json({ message: 'Log not found or already deleted' });
      return;
    }

    res.status(200).json({ message: 'Deleted' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('deleteInsulinLog failed:', msg);
    res.status(500).json({ message: msg });
  }
}

function serialiseInsulinLog(log: {
  id: string; userId: string; dose: number; insulinType: string;
  loggedAt: Date; notes: string | null; source: string;
  idempotencyKey: string | null; createdAt: Date;
}) {
  return {
    ...log,
    insulinType: log.insulinType === 'FAST' ? 'fast' : 'slow',
    loggedAt: log.loggedAt.toISOString(),
    createdAt: log.createdAt.toISOString(),
  };
}
