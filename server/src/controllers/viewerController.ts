import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

/**
 * GET /api/viewer/summary
 * Returns the owner's health summary for a viewer (family member).
 * Only accessible by VIEWER role users who have an ACCEPTED family membership.
 */
export async function getViewerSummary(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth?.userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

    // Find the viewer's accepted family membership
    const membership = await prisma.familyMember.findUnique({
      where: { userId: req.auth.userId },
      include: { family: { include: { owner: true } } },
    });

    if (!membership || membership.status !== 'ACCEPTED') {
      res.status(403).json({ message: 'You are not an accepted member of any family' });
      return;
    }

    const ownerId = membership.family.ownerId;
    const owner = membership.family.owner;

    // Latest glucose reading
    const latestGlucose = await prisma.glucoseLog.findFirst({
      where: { userId: ownerId },
      orderBy: { loggedAt: 'desc' },
    });

    // 7-day glucose trend
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const glucoseTrend = await prisma.glucoseLog.findMany({
      where: { userId: ownerId, loggedAt: { gte: sevenDaysAgo } },
      orderBy: { loggedAt: 'asc' },
      take: 20,
      select: { value: true, unit: true, loggedAt: true },
    });

    // Latest meal
    const latestMeal = await prisma.mealLog.findFirst({
      where: { userId: ownerId },
      orderBy: { loggedAt: 'desc' },
      select: { mealName: true, calories: true, carbs: true, protein: true, fat: true, loggedAt: true },
    });

    // Latest insulin
    const latestInsulin = await prisma.insulinLog.findFirst({
      where: { userId: ownerId },
      orderBy: { loggedAt: 'desc' },
      select: { dose: true, insulinType: true, loggedAt: true },
    });

    // Recent unread alerts for the owner
    const recentAlerts = await prisma.alert.findMany({
      where: { userId: ownerId, isRead: false },
      orderBy: { triggeredAt: 'desc' },
      take: 5,
      select: { id: true, type: true, message: true, triggeredAt: true },
    });

    // Today's stats
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayGlucoseCount = await prisma.glucoseLog.count({
      where: { userId: ownerId, loggedAt: { gte: todayStart } },
    });

    const todayMealCount = await prisma.mealLog.count({
      where: { userId: ownerId, loggedAt: { gte: todayStart } },
    });

    res.status(200).json({
      owner: {
        name: owner.name,
        targetGlucoseMin: owner.targetGlucoseMin,
        targetGlucoseMax: owner.targetGlucoseMax,
        diabetesType: owner.diabetesType.toLowerCase(),
      },
      latestGlucose: latestGlucose ? {
        value: latestGlucose.value,
        unit: latestGlucose.unit === 'MG_DL' ? 'mg/dL' : 'mmol/L',
        loggedAt: latestGlucose.loggedAt.toISOString(),
      } : null,
      glucoseTrend: glucoseTrend.map((g) => ({
        value: g.value,
        time: g.loggedAt.toISOString(),
      })),
      latestMeal: latestMeal ? {
        ...latestMeal,
        loggedAt: latestMeal.loggedAt.toISOString(),
      } : null,
      latestInsulin: latestInsulin ? {
        dose: latestInsulin.dose,
        insulinType: latestInsulin.insulinType === 'FAST' ? 'fast' : 'slow',
        loggedAt: latestInsulin.loggedAt.toISOString(),
      } : null,
      recentAlerts: recentAlerts.map((a) => ({
        id: a.id,
        type: a.type,
        message: a.message,
        triggeredAt: a.triggeredAt.toISOString(),
      })),
      todayStats: {
        glucoseReadings: todayGlucoseCount,
        mealsLogged: todayMealCount,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('getViewerSummary failed:', msg);
    res.status(500).json({ message: msg });
  }
}
