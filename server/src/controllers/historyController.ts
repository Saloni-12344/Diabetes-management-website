import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { fromFilter } from '../utils/dateFilter.js';

// GET /api/history?filter=today|7d|30d
// Returns a merged, date-sorted timeline of glucose, insulin, and meal logs
export async function listHistory(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth?.userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

    const from = fromFilter(String(req.query.filter || '7d'));
    const userId = req.auth.userId;

    const [glucoseLogs, insulinLogs, mealLogs] = await Promise.all([
      prisma.glucoseLog.findMany({
        where: { userId, ...(from ? { loggedAt: { gte: from } } : {}) },
        orderBy: { loggedAt: 'desc' },
        take: 500,
      }),
      prisma.insulinLog.findMany({
        where: { userId, ...(from ? { loggedAt: { gte: from } } : {}) },
        orderBy: { loggedAt: 'desc' },
        take: 500,
      }),
      prisma.mealLog.findMany({
        where: { userId, ...(from ? { loggedAt: { gte: from } } : {}) },
        orderBy: { loggedAt: 'desc' },
        take: 500,
      }),
    ]);

    // Shape every entry into a uniform event object
    type HistoryEvent = {
      id: string;
      kind: 'glucose' | 'insulin' | 'meal';
      loggedAt: string;
      summary: string;
      detail: string;
      icon: string;
      badge: 'normal' | 'warning' | 'danger';
      raw: Record<string, unknown>;
    };

    const events: HistoryEvent[] = [];

    for (const g of glucoseLogs) {
      const badge: HistoryEvent['badge'] =
        g.value > 250 || g.value < 54 ? 'danger' :
        g.value > 180 || g.value < 70 ? 'warning' : 'normal';
      events.push({
        id: g.id,
        kind: 'glucose',
        loggedAt: g.loggedAt.toISOString(),
        summary: `${g.value} ${g.unit === 'MMOL_L' ? 'mmol/L' : 'mg/dL'}`,
        detail: badge === 'danger'
          ? g.value < 54 ? 'Critical low' : 'Critical high'
          : badge === 'warning'
          ? g.value > 180 ? 'Above target' : 'Below target'
          : 'In range',
        icon: '🩸',
        badge,
        raw: { value: g.value, unit: g.unit === 'MMOL_L' ? 'mmol/L' : 'mg/dL', notes: g.notes },
      });
    }

    for (const i of insulinLogs) {
      events.push({
        id: i.id,
        kind: 'insulin',
        loggedAt: i.loggedAt.toISOString(),
        summary: `${i.dose}u ${i.insulinType === 'FAST' ? 'Fast-acting' : 'Slow-acting'}`,
        detail: i.notes ?? '',
        icon: '💉',
        badge: 'normal',
        raw: { dose: i.dose, insulinType: i.insulinType === 'FAST' ? 'fast' : 'slow', notes: i.notes },
      });
    }

    for (const m of mealLogs) {
      const badge: HistoryEvent['badge'] =
        m.carbs > 50 && m.protein < 10 ? 'warning' : 'normal';
      events.push({
        id: m.id,
        kind: 'meal',
        loggedAt: m.loggedAt.toISOString(),
        summary: m.mealName,
        detail: `${m.carbs}g carbs · ${m.protein}g protein · ${Math.round(m.calories)} kcal`,
        icon: '🍛',
        badge,
        raw: {
          mealName: m.mealName, grams: m.grams,
          calories: m.calories, carbs: m.carbs, protein: m.protein, fat: m.fat,
          notes: m.notes,
        },
      });
    }

    // Sort newest first
    events.sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));

    res.status(200).json({ events });
  } catch (error) {
    console.error('listHistory failed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
