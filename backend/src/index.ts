import http from 'http';
import path from 'path';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';
import { apiRouter } from './routes';
import { prisma } from './lib/prisma';
import { setupRoomHandlers } from './socket/roomHandlers';

// Load environment variables (look in backend/ and root)
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const server = http.createServer(app);

const PORT = parseInt(process.env.PORT || '5000', 10);

// Production-ready CORS origin parsing (supports single, comma-separated list, or wildcard)
const rawCorsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
const corsOriginConfig: boolean | string | string[] =
  rawCorsOrigin === '*'
    ? true
    : rawCorsOrigin.includes(',')
    ? rawCorsOrigin.split(',').map((s) => s.trim()).filter(Boolean)
    : rawCorsOrigin;

// Setup Socket.io
export const io = new SocketIOServer(server, {
  cors: {
    origin: corsOriginConfig,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(
  cors({
    origin: corsOriginConfig,
    credentials: true,
  })
);
app.use(express.json());

// API Routes
app.use('/api', apiRouter);

// Root route
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: "Multiplayer Texas Hold'em API",
    version: '1.0.0',
    status: 'online',
    endpoints: {
      health: '/api/health',
      users: '/api/users',
      games: '/api/games',
      stats: '/api/stats',
    },
  });
});

// 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global Error Handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Socket.io events
io.on('connection', (socket) => {
  console.log(`Socket client connected: ${socket.id}`);

  // Attach Phase 3 room management handlers
  setupRoomHandlers(io, socket);

  socket.on('ping', (callback) => {
    if (typeof callback === 'function') {
      callback({ status: 'ok', serverTime: Date.now() });
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`Socket client disconnected: ${socket.id} (${reason})`);
  });
});

// Server startup
server.listen(PORT, () => {
  console.log(`♠️ ♥️ ♦️ ♣️ Poker Backend Server running on http://localhost:${PORT}`);
  console.log(`Allowed CORS Origin: ${rawCorsOrigin}`);
});

// Graceful shutdown
const handleShutdown = async (signal: string) => {
  console.log(`Received ${signal}, shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log('Database disconnected. Process exiting.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

export { app, server };
