import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

export const gamesRouter = Router();

const playerRecordSchema = z.object({
  userId: z.string().optional(),
  username: z.string().min(1, 'Username is required'),
  buyIn: z.number().nonnegative().optional(),
  finalChips: z.number().nonnegative().optional(),
  net: z.number(), // positive is win, negative is loss
});

const createGameRecordSchema = z.object({
  roomCode: z.string().optional(),
  totalPot: z.number().nonnegative().optional(),
  players: z.array(playerRecordSchema).min(1, 'At least one player is required'),
});

// GET /api/games - List game records
gamesRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const games = await prisma.gameRecord.findMany({
      orderBy: { date: 'desc' },
      take: 50,
    });

    return res.json({ games });
  } catch (error) {
    console.error('Error fetching game records:', error);
    return res.status(500).json({ error: 'Failed to fetch game records' });
  }
});

// GET /api/games/:id - Get game record by ID
gamesRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const game = await prisma.gameRecord.findUnique({
      where: { id },
    });

    if (!game) {
      return res.status(404).json({ error: 'Game record not found' });
    }

    return res.json({ game });
  } catch (error) {
    console.error('Error fetching game record:', error);
    return res.status(500).json({ error: 'Failed to fetch game record' });
  }
});

// POST /api/games - Create new game record
gamesRouter.post('/', async (req: Request, res: Response) => {
  try {
    const parseResult = createGameRecordSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: parseResult.error.format(),
      });
    }

    const { roomCode, totalPot, players } = parseResult.data;

    const game = await prisma.gameRecord.create({
      data: {
        roomCode,
        totalPot: totalPot ?? 0,
        players,
      },
    });

    // Optionally update player lifetime stats if user IDs are provided
    for (const player of players) {
      if (player.userId) {
        if (player.net > 0) {
          await prisma.user
            .update({
              where: { id: player.userId },
              data: {
                lifetimeWinnings: { increment: player.net },
              },
            })
            .catch((err) =>
              console.warn(
                `Could not update stats for user ${player.userId}:`,
                err.message
              )
            );
        } else if (player.net < 0) {
          await prisma.user
            .update({
              where: { id: player.userId },
              data: {
                lifetimeLosses: { increment: Math.abs(player.net) },
              },
            })
            .catch((err) =>
              console.warn(
                `Could not update stats for user ${player.userId}:`,
                err.message
              )
            );
        }
      }
    }

    return res.status(201).json({
      message: 'Game record created successfully',
      game,
    });
  } catch (error) {
    console.error('Error creating game record:', error);
    return res.status(500).json({ error: 'Failed to create game record' });
  }
});
