import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import { connectDb, isDbConnected } from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import { advisoryRoutes } from './routes/advisoryRoutes.js';
import { authRoutes } from './routes/authRoutes.js';
import { familyRoutes } from './routes/familyRoutes.js';
import { foodLibraryRoutes } from './routes/foodLibraryRoutes.js';
import { glucoseRoutes } from './routes/glucoseRoutes.js';
import { insulinRoutes } from './routes/insulinRoutes.js';
import { mealRoutes } from './routes/mealRoutes.js';
import { protectedRoutes } from './routes/protectedRoutes.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({
    ok: true,
    service: 'server',
    db: isDbConnected() ? 'connected' : 'disconnected',
    dbState: mongoose.connection.readyState,
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/protected', protectedRoutes);
app.use('/api/advisory', advisoryRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/glucose', glucoseRoutes);
app.use('/api/insulin', insulinRoutes);
app.use('/api/meals', mealRoutes);
app.use('/api/food-library', foodLibraryRoutes);

app.use(errorHandler);

const port = Number(process.env.SERVER_PORT || 5001);

async function start(): Promise<void> {
  try {
    await connectDb();
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

void start();
