import { Router, Request, Response } from 'express';
import { roomManager } from '../rooms/roomManager';

export const roomsRouter = Router();

// GET /api/rooms - List all active waiting tables
roomsRouter.get('/', (_req: Request, res: Response) => {
  const rooms = roomManager.getActiveRooms();
  return res.json({ rooms });
});

// GET /api/rooms/:code - Fetch table info
roomsRouter.get('/:code', (req: Request, res: Response) => {
  const { code } = req.params;
  const room = roomManager.getRoom(code);
  if (!room) {
    return res.status(404).json({ error: `Table "${code}" not found.` });
  }
  return res.json({ room });
});

// POST /api/rooms - Create room via HTTP
roomsRouter.post('/', (req: Request, res: Response) => {
  const { userId, username, name, startingChips, smallBlind, bigBlind } = req.body;

  if (!userId || !username) {
    return res.status(400).json({ error: 'User ID and username are required.' });
  }

  const room = roomManager.createRoom(
    { socketId: '', userId, username },
    { name, config: { startingChips, smallBlind, bigBlind } }
  );

  return res.status(201).json({ room });
});
