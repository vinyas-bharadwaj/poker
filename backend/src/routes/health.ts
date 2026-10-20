import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const healthRouter = Router();

healthRouter.get('/', async (_req: Request, res: Response) => {
  let dbStatus = 'disconnected';
  let latencyMs = 0;

  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    latencyMs = Date.now() - start;
    dbStatus = 'connected';
  } catch (error) {
    dbStatus = error instanceof Error ? `error: ${error.message}` : 'error';
  }

  const isHealthy = dbStatus === 'connected';

  return res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    service: 'poker-backend',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: dbStatus,
      latencyMs: dbStatus === 'connected' ? latencyMs : null,
    },
  });
});
