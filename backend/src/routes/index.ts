import { Router } from 'express';
import { healthRouter } from './health';
import { usersRouter } from './users';
import { gamesRouter } from './games';
import { statsRouter } from './stats';
import { authRouter } from './auth';
import { roomsRouter } from './rooms';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/games', gamesRouter);
apiRouter.use('/stats', statsRouter);
apiRouter.use('/rooms', roomsRouter);
