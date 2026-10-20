import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const statsRouter = Router();

statsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const [userCount, gameCount, topWinners] = await Promise.all([
      prisma.user.count(),
      prisma.gameRecord.count(),
      prisma.user.findMany({
        select: {
          id: true,
          username: true,
          lifetimeWinnings: true,
          lifetimeLosses: true,
        },
        orderBy: { lifetimeWinnings: 'desc' },
        take: 5,
      }),
    ]);

    return res.json({
      userCount,
      gameCount,
      topWinners: topWinners.map((u) => ({
        ...u,
        netProfit: u.lifetimeWinnings - u.lifetimeLosses,
      })),
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return res.status(500).json({ error: 'Failed to fetch platform statistics' });
  }
});
