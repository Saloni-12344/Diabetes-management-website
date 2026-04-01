import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export async function listAlerts(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth?.userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

    const unreadOnly = req.query.unread === 'true';

    const alerts = await prisma.alert.findMany({
      where: {
        userId: req.auth.userId,
        ...(unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { triggeredAt: 'desc' },
      take: 100,
    });

    res.status(200).json({ alerts: alerts.map(serialiseAlert) });
  } catch (error) {
    console.error('listAlerts failed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function markAlertRead(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth?.userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

    const id = req.params.id as string;
    const existing = await prisma.alert.findFirst({
      where: { id, userId: req.auth.userId },
    });
    if (!existing) { res.status(404).json({ message: 'Alert not found' }); return; }

    await prisma.alert.update({ where: { id }, data: { isRead: true } });
    res.status(200).json({ message: 'Marked as read' });
  } catch (error) {
    console.error('markAlertRead failed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function markAllAlertsRead(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth?.userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

    await prisma.alert.updateMany({
      where: { userId: req.auth.userId, isRead: false },
      data: { isRead: true },
    });
    res.status(200).json({ message: 'All alerts marked as read' });
  } catch (error) {
    console.error('markAllAlertsRead failed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function deleteAlert(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth?.userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

    const id = req.params.id as string;
    const existing = await prisma.alert.findFirst({
      where: { id, userId: req.auth.userId },
    });
    if (!existing) { res.status(404).json({ message: 'Alert not found' }); return; }

    await prisma.alert.delete({ where: { id } });
    res.status(200).json({ message: 'Deleted' });
  } catch (error) {
    console.error('deleteAlert failed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getUnreadCount(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth?.userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

    const count = await prisma.alert.count({
      where: { userId: req.auth.userId, isRead: false },
    });
    res.status(200).json({ count });
  } catch (error) {
    console.error('getUnreadCount failed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// ── Internal helper — called by other controllers to fire an alert ────────────
export async function createAlert(params: {
  userId: string;
  type: 'POST_MEAL_WALK' | 'HIGH_CARB_LOW_PROTEIN' | 'PATTERN' | 'CRITICAL_GLUCOSE';
  message: string;
  relatedLogId?: string;
}): Promise<void> {
  try {
    // Cooldown: don't create same alert type for same user within 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await prisma.alert.findFirst({
      where: {
        userId: params.userId,
        type: params.type,
        triggeredAt: { gte: oneHourAgo },
      },
    });
    if (recent) return; // within cooldown window — skip

    await prisma.alert.create({
      data: {
        userId: params.userId,
        type: params.type,
        message: params.message,
        relatedLogId: params.relatedLogId,
        isRead: false,
      },
    });
  } catch (error) {
    console.error('createAlert helper failed:', error);
  }
}

function serialiseAlert(alert: {
  id: string; userId: string; type: string; message: string;
  relatedLogId: string | null; isRead: boolean; triggeredAt: Date; createdAt: Date;
}) {
  const typeMap: Record<string, string> = {
    POST_MEAL_WALK: 'post_meal_walk',
    HIGH_CARB_LOW_PROTEIN: 'high_carb_low_protein',
    PATTERN: 'pattern',
    CRITICAL_GLUCOSE: 'critical_glucose',
  };
  return {
    ...alert,
    type: typeMap[alert.type] ?? alert.type,
    triggeredAt: alert.triggeredAt.toISOString(),
    createdAt: alert.createdAt.toISOString(),
  };
}
