import type { Server as HttpServer } from 'http';
import type { ExtendedError, Socket } from 'socket.io';
import { Server as SocketServer } from 'socket.io';
import { verifyAuthToken } from '../utils/jwt.js';

let io: SocketServer | null = null;

export function initSocket(httpServer: HttpServer, allowedOrigins: string[]): SocketServer {
  io = new SocketServer(httpServer, {
    cors: { origin: allowedOrigins, credentials: true },
  });

  // Authenticate every socket connection via JWT in handshake auth
  io.use((socket: Socket, next: (err?: ExtendedError) => void) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) { next(new Error('Authentication required')); return; }
    try {
      const payload = verifyAuthToken(token);
      socket.data.userId = payload.userId;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId as string;
    void socket.join(`user:${userId}`);
    console.log(`Socket connected: ${userId}`);
    socket.on('disconnect', () => { console.log(`Socket disconnected: ${userId}`); });
  });

  return io;
}

export function emitToUser(userId: string, event: string, payload: Record<string, unknown>): void {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
}

export async function emitToFamily(
  ownerId: string, memberIds: string[],
  event: string, payload: Record<string, unknown>,
): Promise<void> {
  if (!io) return;
  for (const id of [ownerId, ...memberIds]) {
    io.to(`user:${id}`).emit(event, payload);
  }
}
