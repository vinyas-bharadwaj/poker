import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

export const usersRouter = Router();

const createUserSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username can only contain alphanumeric characters, underscores, and dashes'
    ),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// GET /api/users - List all users (sorted by net winnings by default, or by query param)
usersRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { sort } = req.query;
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        lifetimeWinnings: true,
        lifetimeLosses: true,
        createdAt: true,
      },
    });

    // Compute net balance (lifetimeWinnings - lifetimeLosses)
    const withNet = users.map((u) => ({
      ...u,
      net: u.lifetimeWinnings - u.lifetimeLosses,
    }));

    // Sort order: default is biggest winners first
    if (sort === 'losers') {
      // Lowest net balance / highest deficit first
      withNet.sort((a, b) => a.net - b.net);
    } else if (sort === 'winnings') {
      // Gross winnings descending
      withNet.sort((a, b) => b.lifetimeWinnings - a.lifetimeWinnings);
    } else if (sort === 'losses') {
      // Gross losses descending
      withNet.sort((a, b) => b.lifetimeLosses - a.lifetimeLosses);
    } else {
      // Default: Biggest winners first (highest net profit)
      withNet.sort((a, b) => b.net - a.net);
    }

    return res.json({ users: withNet });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/users/:id - Get user by ID
usersRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        lifetimeWinnings: true,
        lifetimeLosses: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST /api/users - Create new user
usersRouter.post('/', async (req: Request, res: Response) => {
  try {
    const parseResult = createUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message || 'Validation error';
      return res.status(400).json({
        error: firstError,
        details: parseResult.error.format(),
      });
    }

    const { username, email, password } = parseResult.data;

    // Check existing username or email
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existing) {
      const field = existing.email === email ? 'Email' : 'Username';
      return res.status(409).json({ error: `${field} is already taken` });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        lifetimeWinnings: 0.0,
        lifetimeLosses: 0.0,
      },
      select: {
        id: true,
        username: true,
        email: true,
        lifetimeWinnings: true,
        lifetimeLosses: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      message: 'User created successfully',
      user,
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({ error: 'Failed to create user' });
  }
});
