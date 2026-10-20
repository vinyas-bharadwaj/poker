import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

export const authRouter = Router();

const loginSchema = z.object({
  identifier: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
});

// POST /api/auth/login - Minimal, simple login
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res
        .status(400)
        .json({ error: 'Please enter both username/email and password' });
    }

    const { identifier, password } = parseResult.data;

    // Find user by either email or username
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier.toLowerCase() }, { username: identifier }],
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    // Return sanitized user object
    return res.json({
      message: 'Logged in successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        lifetimeWinnings: user.lifetimeWinnings,
        lifetimeLosses: user.lifetimeLosses,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal login error' });
  }
});

// GET /api/auth/me/:id - Fetch current session profile
authRouter.get('/me/:id', async (req: Request, res: Response) => {
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
      return res.status(404).json({ error: 'User session not found' });
    }

    return res.json({ user });
  } catch (error) {
    console.error('Fetch me error:', error);
    return res.status(500).json({ error: 'Failed to retrieve profile' });
  }
});
