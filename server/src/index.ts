import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import { prisma } from './lib/prisma.js';
import { initSocket } from './lib/socket.js';
import { errorHandler } from './middleware/errorHandler.js';
import { advisoryRoutes } from './routes/advisoryRoutes.js';
import { alertRoutes } from './routes/alertRoutes.js';
import { authRoutes } from './routes/authRoutes.js';
import { familyRoutes } from './routes/familyRoutes.js';
import { foodLibraryRoutes } from './routes/foodLibraryRoutes.js';
import { glucoseRoutes } from './routes/glucoseRoutes.js';
import { geminiRoutes } from './routes/geminiRoutes.js';
import { historyRoutes } from './routes/historyRoutes.js';
import viewerRoutes from './routes/viewerRoutes.js';
import { insulinRoutes } from './routes/insulinRoutes.js';
import { mealRoutes } from './routes/mealRoutes.js';
import { protectedRoutes } from './routes/protectedRoutes.js';

dotenv.config();

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

const app = express();
const httpServer = createServer(app);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin "${origin}" is not allowed`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '8mb' })); // raised for base64 image uploads

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ ok: true, service: 'server', db: 'connected' });
  } catch {
    res.status(500).json({ ok: false, service: 'server', db: 'disconnected' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/protected', protectedRoutes);
app.use('/api/advisory', advisoryRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/glucose', glucoseRoutes);
app.use('/api/insulin', insulinRoutes);
app.use('/api/meals', mealRoutes);
app.use('/api/food-library', foodLibraryRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/gemini', geminiRoutes);
app.use('/api/viewer', viewerRoutes);

app.use(errorHandler);

const port = Number(process.env.SERVER_PORT || 5001);

async function start(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('PostgreSQL connected');

    initSocket(httpServer, ALLOWED_ORIGINS);

    httpServer.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

void start();
