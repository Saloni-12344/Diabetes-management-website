import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export async function calculateAdvisory(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth?.userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

    const { currentGlucose, mealCarbs, icr, isf, targetGlucose, iob = 0, disclaimerConfirmed, confirmedByUser } = req.body as {
      currentGlucose?: number; mealCarbs?: number; icr?: number; isf?: number;
      targetGlucose?: number; iob?: number; disclaimerConfirmed?: boolean; confirmedByUser?: boolean;
    };

    if (
      typeof currentGlucose !== 'number' || typeof mealCarbs !== 'number' ||
      typeof icr !== 'number' || typeof isf !== 'number' ||
      typeof targetGlucose !== 'number' || typeof iob !== 'number' ||
      !disclaimerConfirmed || !confirmedByUser
    ) {
      res.status(400).json({ message: 'Invalid advisory payload or confirmations missing' });
      return;
    }

    const carbDose = mealCarbs / icr;
    const correctionDose = (currentGlucose - targetGlucose) / isf;
    const rawDose = carbDose + correctionDose - iob;
    const recommendedDose = Math.max(0, Number(rawDose.toFixed(1)));

    const audit = await prisma.advisoryAudit.create({
      data: {
        userId: req.auth.userId,
        currentGlucose,
        mealCarbs,
        icr,
        isf,
        targetGlucose,
        iob,
        recommendedDose,
        disclaimerConfirmed,
        confirmedByUser,
      },
    });

    res.status(200).json({ recommendedDose, auditId: audit.id });
  } catch (error) {
    console.error('advisory calculate failed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function listAdvisoryHistory(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth?.userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

    const audits = await prisma.advisoryAudit.findMany({
      where: { userId: req.auth.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.status(200).json({
      audits: audits.map((a: { createdAt: Date } & Record<string, unknown>) => ({ ...a, createdAt: a.createdAt.toISOString() })),
    });
  } catch (error) {
    console.error('advisory history failed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
