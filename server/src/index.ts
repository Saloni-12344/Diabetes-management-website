import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import { connectDb, isDbConnected } from './config/db.js';
import { authRoutes } from './routes/authRoutes.js';
import { familyRoutes } from './routes/familyRoutes.js';

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
app.use('/api/family', familyRoutes);

const port = Number(process.env.SERVER_PORT || 5000);

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
