import type { Request, Response } from 'express';
import { FoodLibrary } from '../models/FoodLibrary.js';

export async function createFoodItem(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth?.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const {
      dishName,
      gramsPerServing,
      calories,
      carbs,
      protein,
      fat,
      isCooked,
      photoUrl,
    } = req.body as {
      dishName?: string;
      gramsPerServing?: number;
      calories?: number;
      carbs?: number;
      protein?: number;
      fat?: number;
      isCooked?: boolean;
      photoUrl?: string;
    };

    if (!dishName || typeof gramsPerServing !== 'number' || gramsPerServing <= 0) {
      res.status(400).json({ message: 'dishName and positive gramsPerServing are required' });
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

    const item = await FoodLibrary.create({
      createdByUserId: req.auth.userId,
      familyOwnerId: req.auth.userId,
      dishName: dishName.trim(),
      gramsPerServing,
      calories,
      carbs,
      protein,
      fat,
      isCooked: isCooked ?? true,
      photoUrl,
      isConfirmed: true,
    });

    res.status(201).json({ item });
  } catch (error) {
    console.error('createFoodItem failed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function listFoodLibrary(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth?.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const items = await FoodLibrary.find({ familyOwnerId: req.auth.userId }).sort({ dishName: 1 });
    res.status(200).json({ items });
  } catch (error) {
    console.error('listFoodLibrary failed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function updateFoodItem(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth?.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const item = await FoodLibrary.findOneAndUpdate(
      { _id: req.params.id, familyOwnerId: req.auth.userId },
      req.body,
      { new: true },
    );

    if (!item) {
      res.status(404).json({ message: 'Item not found' });
      return;
    }

    res.status(200).json({ item });
  } catch (error) {
    console.error('updateFoodItem failed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function deleteFoodItem(req: Request, res: Response): Promise<void> {
  try {
    if (!req.auth?.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const deleted = await FoodLibrary.findOneAndDelete({
      _id: req.params.id,
      familyOwnerId: req.auth.userId,
    });

    if (!deleted) {
      res.status(404).json({ message: 'Item not found' });
      return;
    }

    res.status(200).json({ message: 'Deleted' });
  } catch (error) {
    console.error('deleteFoodItem failed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
