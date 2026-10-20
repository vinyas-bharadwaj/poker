import { TexasHoldemEngine } from '../game/engine';
import { prisma } from '../lib/prisma';

export interface RoomPlayer {
  socketId: string;
  userId: string;
  username: string;
  isGameMaster: boolean;
  isReady: boolean;
  chips: number;
  joinedAt: number;
  isDisconnected?: boolean;
}

export interface TableConfig {
  startingChips: number;
  smallBlind: number;
  bigBlind: number;
  maxPlayers: number;
}

export interface PlayerScoreboardEntry {
  userId: string;
  username: string;
  buyIn: number;
  finalChips: number;
  net: number; // positive = profit, negative = loss
}

export interface DebtSettlementTransaction {
  fromUserId?: string;
  fromUsername: string;
  toUserId?: string;
  toUsername: string;
  amount: number;
}

export interface EndGameResult {
  roomCode: string;
  totalHands: number;
  scoreboard: PlayerScoreboardEntry[];
  settlements: DebtSettlementTransaction[];
  gameRecordId?: string;
}

export interface Room {
  code: string;
  name: string;
  gameMasterId: string;
  gameMasterUsername: string;
  players: RoomPlayer[];
  status: 'waiting' | 'in_progress' | 'settled';
  config: TableConfig;
  createdAt: number;
  settlement?: EndGameResult;
}

class RoomManager {
  private rooms: Map<string, Room> = new Map();
  // Map socketId -> Set of roomCodes
  private socketRooms: Map<string, Set<string>> = new Map();
  // Map "roomCode:userId" -> Timeout for disconnect grace period
  private disconnectTimers: Map<string, NodeJS.Timeout> = new Map();
  // Map roomCode -> TexasHoldemEngine
  private engines: Map<string, TexasHoldemEngine> = new Map();

  // Generate a distinct 5-character room code (avoiding ambiguous chars: 0/O, 1/I)
  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    do {
      code = '';
      for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.rooms.has(code));
    return code;
  }

  createRoom(
    host: { socketId: string; userId: string; username: string },
    options?: { name?: string; config?: Partial<TableConfig> }
  ): Room {
    const code = this.generateRoomCode();
    const config: TableConfig = {
      startingChips: options?.config?.startingChips ?? 1000,
      smallBlind: options?.config?.smallBlind ?? 10,
      bigBlind: options?.config?.bigBlind ?? 20,
      maxPlayers: options?.config?.maxPlayers ?? 8,
    };

    const hostPlayer: RoomPlayer = {
      socketId: host.socketId,
      userId: host.userId,
      username: host.username,
      isGameMaster: true,
      isReady: true,
      chips: config.startingChips,
      joinedAt: Date.now(),
    };

    const room: Room = {
      code,
      name: options?.name?.trim() || `${host.username}'s Table`,
      gameMasterId: host.userId,
      gameMasterUsername: host.username,
      players: [hostPlayer],
      status: 'waiting',
      config,
      createdAt: Date.now(),
    };

    this.rooms.set(code, room);
    if (host.socketId) {
      this.trackSocket(host.socketId, code);
    }

    return room;
  }

  joinRoom(
    code: string,
    player: { socketId: string; userId: string; username: string }
  ): { room?: Room; error?: string; reconnected?: boolean } {
    const cleanCode = code.toUpperCase();
    const room = this.rooms.get(cleanCode);
    if (!room) {
      return { error: `Table "${code}" does not exist.` };
    }

    // Cancel any pending disconnect timer for this user in this room (e.g. browser refresh)
    const timerKey = `${cleanCode}:${player.userId}`;
    const pendingTimer = this.disconnectTimers.get(timerKey);
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      this.disconnectTimers.delete(timerKey);
    }

    // Check if player is already seated in room (preserving isReady and chips!)
    const existingIndex = room.players.findIndex((p) => p.userId === player.userId);
    if (existingIndex !== -1) {
      const existingPlayer = room.players[existingIndex];
      // Untrack old socket if any
      if (existingPlayer.socketId && existingPlayer.socketId !== player.socketId) {
        this.untrackSocket(existingPlayer.socketId, cleanCode);
      }

      existingPlayer.socketId = player.socketId;
      existingPlayer.isDisconnected = false;
      this.trackSocket(player.socketId, cleanCode);

      // Update engine player socket as well
      const engine = this.engines.get(cleanCode);
      if (engine) {
        const engPlayer = engine.players.find((p) => p.userId === player.userId);
        if (engPlayer) {
          engPlayer.socketId = player.socketId;
        }
      }

      return { room, reconnected: true };
    }

    // New players cannot join if game has already started
    if (room.status !== 'waiting') {
      return { error: 'Game is already in progress.' };
    }

    if (room.players.length >= room.config.maxPlayers) {
      return { error: 'Table is full.' };
    }

    const newPlayer: RoomPlayer = {
      socketId: player.socketId,
      userId: player.userId,
      username: player.username,
      isGameMaster: false,
      isReady: false,
      chips: room.config.startingChips,
      joinedAt: Date.now(),
    };

    room.players.push(newPlayer);
    this.trackSocket(player.socketId, cleanCode);

    return { room, reconnected: false };
  }

  leaveRoom(
    code: string,
    userIdOrSocketId: string
  ): { room?: Room; removedPlayer?: RoomPlayer; roomClosed?: boolean } {
    const cleanCode = code.toUpperCase();
    const room = this.rooms.get(cleanCode);
    if (!room) return {};

    const playerIndex = room.players.findIndex(
      (p) => p.userId === userIdOrSocketId || p.socketId === userIdOrSocketId
    );

    if (playerIndex === -1) return {};

    const [removedPlayer] = room.players.splice(playerIndex, 1);
    this.untrackSocket(removedPlayer.socketId, cleanCode);

    // Cancel any pending disconnect timer
    const timerKey = `${cleanCode}:${removedPlayer.userId}`;
    const pendingTimer = this.disconnectTimers.get(timerKey);
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      this.disconnectTimers.delete(timerKey);
    }

    // Per user specification: If the Game Master exits the table, all players leave and table is discarded
    if (removedPlayer.isGameMaster) {
      this.rooms.delete(cleanCode);
      this.engines.delete(cleanCode);
      // Clean up socket tracking for all players in discarded room
      for (const p of room.players) {
        this.untrackSocket(p.socketId, cleanCode);
      }
      return { roomClosed: true, removedPlayer };
    }

    // If an active game is running, fold the leaving player so table isn't stalled
    const engine = this.engines.get(cleanCode);
    if (engine && engine.round !== 'idle' && engine.round !== 'showdown') {
      const engPlayer = engine.players.find((p) => p.userId === removedPlayer.userId);
      if (engPlayer && !engPlayer.folded) {
        engine.handlePlayerAction(removedPlayer.userId, 'fold');
      }
    }

    // If room is now empty, delete it
    if (room.players.length === 0) {
      this.rooms.delete(cleanCode);
      this.engines.delete(cleanCode);
      return { roomClosed: true, removedPlayer };
    }

    return { room, removedPlayer, roomClosed: false };
  }

  toggleReady(code: string, userId: string): Room | undefined {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) return undefined;

    const player = room.players.find((p) => p.userId === userId);
    if (player && !player.isGameMaster) {
      player.isReady = !player.isReady;
    }

    return room;
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  getActiveRooms(): Room[] {
    return Array.from(this.rooms.values())
      .filter((r) => r.status === 'waiting')
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  getEngine(code: string): TexasHoldemEngine | undefined {
    return this.engines.get(code.toUpperCase());
  }

  startGame(
    code: string,
    userId: string
  ): { success: boolean; engine?: TexasHoldemEngine; error?: string } {
    const cleanCode = code.toUpperCase();
    const room = this.rooms.get(cleanCode);
    if (!room) {
      return { success: false, error: 'Table not found.' };
    }

    if (room.gameMasterId !== userId) {
      return { success: false, error: 'Only the Game Master can deal the game.' };
    }

    if (room.players.length < 2) {
      return { success: false, error: 'At least 2 players are required to play.' };
    }

    let engine = this.engines.get(cleanCode);
    if (!engine) {
      engine = new TexasHoldemEngine(cleanCode, room.config);
      this.engines.set(cleanCode, engine);
    }

    room.status = 'in_progress';
    engine.setPlayers(room.players);
    const started = engine.startNewHand();

    if (!started) {
      return { success: false, error: 'Could not deal hand: not enough players with chips.' };
    }

    // Sync room chips
    this.syncChipsFromEngine(cleanCode);

    return { success: true, engine };
  }

  nextHand(
    code: string,
    userId: string
  ): { success: boolean; engine?: TexasHoldemEngine; error?: string } {
    const cleanCode = code.toUpperCase();
    const room = this.rooms.get(cleanCode);
    if (!room) {
      return { success: false, error: 'Table not found.' };
    }

    if (room.gameMasterId !== userId) {
      return { success: false, error: 'Only the Game Master can deal the next hand.' };
    }

    const engine = this.engines.get(cleanCode);
    if (!engine) {
      return { success: false, error: 'No active game found.' };
    }

    const started = engine.startNewHand();
    if (!started) {
      return {
        success: false,
        error: 'Not enough players with chips remaining to deal another hand.',
      };
    }

    this.syncChipsFromEngine(cleanCode);

    return { success: true, engine };
  }

  syncChipsFromEngine(code: string) {
    const cleanCode = code.toUpperCase();
    const room = this.rooms.get(cleanCode);
    const engine = this.engines.get(cleanCode);
    if (!room || !engine) return;

    for (const p of room.players) {
      const ep = engine.players.find((item) => item.userId === p.userId);
      if (ep) {
        p.chips = ep.chips;
      }
    }
  }

  async endGame(
    code: string,
    userId: string
  ): Promise<{ success: boolean; result?: EndGameResult; error?: string }> {
    const cleanCode = code.toUpperCase();
    const room = this.rooms.get(cleanCode);
    if (!room) {
      return { success: false, error: 'Table not found.' };
    }

    if (room.gameMasterId !== userId) {
      return { success: false, error: 'Only the Game Master can end the session.' };
    }

    // Sync latest chips from engine if game was active
    this.syncChipsFromEngine(cleanCode);

    const engine = this.engines.get(cleanCode);
    const totalHands = engine?.handNumber ?? 0;

    // Calculate Buy-in, Final Chips, and Net Profit/Loss for all players
    const scoreboard: PlayerScoreboardEntry[] = room.players
      .map((p) => {
        const buyIn = room.config.startingChips;
        const finalChips = p.chips;
        const net = finalChips - buyIn;
        return {
          userId: p.userId,
          username: p.username,
          buyIn,
          finalChips,
          net,
        };
      })
      .sort((a, b) => b.net - a.net);

    // Calculate Debt Settlement (Greedy algorithm matching highest debtor with highest creditor)
    const creditors = scoreboard
      .filter((p) => p.net > 0)
      .map((p) => ({ ...p, remaining: p.net }));
    const debtors = scoreboard
      .filter((p) => p.net < 0)
      .map((p) => ({ ...p, remaining: Math.abs(p.net) }));

    const settlements: DebtSettlementTransaction[] = [];

    let cIdx = 0;
    let dIdx = 0;

    while (cIdx < creditors.length && dIdx < debtors.length) {
      const creditor = creditors[cIdx];
      const debtor = debtors[dIdx];

      const settleAmount = Math.min(creditor.remaining, debtor.remaining);
      if (settleAmount > 0) {
        settlements.push({
          fromUserId: debtor.userId,
          fromUsername: debtor.username,
          toUserId: creditor.userId,
          toUsername: creditor.username,
          amount: Math.round(settleAmount),
        });

        creditor.remaining -= settleAmount;
        debtor.remaining -= settleAmount;
      }

      if (creditor.remaining <= 0.01) cIdx++;
      if (debtor.remaining <= 0.01) dIdx++;
    }

    let gameRecordId: string | undefined;

    // Persist session into PostgreSQL GameRecord and update user lifetime stats
    try {
      const record = await prisma.gameRecord.create({
        data: {
          roomCode: cleanCode,
          totalPot: room.players.reduce((sum, p) => sum + p.chips, 0),
          players: scoreboard.map((s) => ({
            userId: s.userId,
            username: s.username,
            buyIn: s.buyIn,
            finalChips: s.finalChips,
            net: s.net,
          })),
        },
      });
      gameRecordId = record.id;

      for (const entry of scoreboard) {
        if (entry.userId) {
          if (entry.net > 0) {
            await prisma.user
              .update({
                where: { id: entry.userId },
                data: { lifetimeWinnings: { increment: entry.net } },
              })
              .catch(() => {});
          } else if (entry.net < 0) {
            await prisma.user
              .update({
                where: { id: entry.userId },
                data: { lifetimeLosses: { increment: Math.abs(entry.net) } },
              })
              .catch(() => {});
          }
        }
      }
    } catch (err) {
      console.error('Error persisting GameRecord:', err);
    }

    room.status = 'settled';
    const result: EndGameResult = {
      roomCode: cleanCode,
      totalHands,
      scoreboard,
      settlements,
      gameRecordId,
    };
    room.settlement = result;

    // Clean up active engine
    this.engines.delete(cleanCode);

    return { success: true, result };
  }

  // Handle socket disconnect with a 5-second grace period for browser reloads
  handleSocketDisconnect(
    socketId: string,
    onGracePeriodExpired: (info: {
      roomCode: string;
      removedPlayer: RoomPlayer;
      room?: Room;
      roomClosed: boolean;
    }) => void
  ) {
    const roomCodes = this.socketRooms.get(socketId);
    if (!roomCodes) return;

    for (const code of Array.from(roomCodes)) {
      const room = this.rooms.get(code);
      if (!room) continue;

      const player = room.players.find((p) => p.socketId === socketId);
      if (!player) continue;

      player.isDisconnected = true;
      const timerKey = `${code}:${player.userId}`;

      // Set a 5-second grace timer to distinguish between a page refresh vs an intentional tab close
      const timer = setTimeout(() => {
        this.disconnectTimers.delete(timerKey);
        // Execute departure after grace period
        const res = this.leaveRoom(code, player.userId);
        if (res.removedPlayer) {
          onGracePeriodExpired({
            roomCode: code,
            removedPlayer: res.removedPlayer,
            room: res.room,
            roomClosed: res.roomClosed ?? false,
          });
        }
      }, 5000);

      this.disconnectTimers.set(timerKey, timer);
    }
  }

  private trackSocket(socketId: string, roomCode: string) {
    if (!socketId) return;
    let set = this.socketRooms.get(socketId);
    if (!set) {
      set = new Set();
      this.socketRooms.set(socketId, set);
    }
    set.add(roomCode);
  }

  private untrackSocket(socketId: string, roomCode: string) {
    if (!socketId) return;
    const set = this.socketRooms.get(socketId);
    if (set) {
      set.delete(roomCode);
      if (set.size === 0) {
        this.socketRooms.delete(socketId);
      }
    }
  }
}

export const roomManager = new RoomManager();
