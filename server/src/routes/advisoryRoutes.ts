import { Router } from 'express';
import { AdvisoryAudit } from '../models/AdvisoryAudit.js';
import { requireAuth } from '../middleware/auth.js';

const advisoryRoutes = Router();

advisoryRoutes.post('/calculate', requireAuth, async (req, res) => {
  try {
    if (!req.auth?.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const {
      currentGlucose,
      mealCarbs,
      icr,
      isf,
      targetGlucose,
      iob = 0,
      disclaimerConfirmed,
      confirmedByUser,
    } = req.body as {
      currentGlucose?: number;
      mealCarbs?: number;
      icr?: number;
      isf?: number;
      targetGlucose?: number;
      iob?: number;
      disclaimerConfirmed?: boolean;
      confirmedByUser?: boolean;
    };

    if (
      typeof currentGlucose !== 'number' ||
      typeof mealCarbs !== 'number' ||
      typeof icr !== 'number' ||
      typeof isf !== 'number' ||
      typeof targetGlucose !== 'number' ||
      typeof iob !== 'number' ||
      !disclaimerConfirmed ||
      !confirmedByUser
    ) {
      res.status(400).json({ message: 'Invalid advisory payload or confirmations missing' });
      return;
    }

    const carbDose = mealCarbs / icr;
    const correctionDose = (currentGlucose - targetGlucose) / isf;
    const rawDose = carbDose + correctionDose - iob;
    const recommendedDose = Math.max(0, Number(rawDose.toFixed(1)));

    const audit = await AdvisoryAudit.create({
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
    });

    res.status(200).json({ recommendedDose, auditId: String(audit._id) });
  } catch (error) {
    console.error('advisory calculate failed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

advisoryRoutes.get('/history', requireAuth, async (req, res) => {
  try {
    if (!req.auth?.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const audits = await AdvisoryAudit.find({ userId: req.auth.userId }).sort({ createdAt: -1 }).limit(50);
    res.status(200).json({ audits });
  } catch (error) {
    console.error('advisory history failed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export { advisoryRoutes };
