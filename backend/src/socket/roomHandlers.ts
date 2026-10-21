import { Server as SocketIOServer, Socket } from 'socket.io';
import { roomManager, Room } from '../rooms/roomManager';
import { PlayerActionType } from '../game/types';

function broadcastGameState(io: SocketIOServer, roomCode: string) {
  const cleanCode = roomCode.toUpperCase();
  const room = roomManager.getRoom(cleanCode);
  const engine = roomManager.getEngine(cleanCode);
  if (!room || !engine) return;

  for (const player of room.players) {
    if (player.socketId) {
      io.to(player.socketId).emit('game:state', engine.getClientState(player.userId));
    }
  }
}

export function setupRoomHandlers(io: SocketIOServer, socket: Socket) {
  // Create a new poker table room
  socket.on(
    'room:create',
    (
      payload: {
        userId: string;
        username: string;
        name?: string;
        startingChips?: number;
        smallBlind?: number;
        bigBlind?: number;
      },
      callback?: (res: { success: boolean; room?: Room; error?: string }) => void
    ) => {
      try {
        if (!payload.userId || !payload.username) {
          callback?.({
            success: false,
            error: 'User information is required to host a table.',
          });
          return;
        }

        const room = roomManager.createRoom(
          {
            socketId: socket.id,
            userId: payload.userId,
            username: payload.username,
          },
          {
            name: payload.name,
            config: {
              startingChips: payload.startingChips,
              smallBlind: payload.smallBlind,
              bigBlind: payload.bigBlind,
            },
          }
        );

        socket.join(room.code);
        console.log(`Table created: ${room.code} by ${payload.username}`);

        // Broadcast updated open rooms list to everyone
        io.emit('rooms:list', roomManager.getActiveRooms());

        callback?.({ success: true, room });
      } catch (err) {
        console.error('Error creating room:', err);
        callback?.({ success: false, error: 'Failed to create room.' });
      }
    }
  );

  // Join an existing room
  socket.on(
    'room:join',
    (
      payload: { roomCode: string; userId: string; username: string },
      callback?: (res: { success: boolean; room?: Room; error?: string }) => void
    ) => {
      try {
        if (!payload.roomCode || !payload.userId || !payload.username) {
          callback?.({ success: false, error: 'Room code and user details required.' });
          return;
        }

        const cleanCode = payload.roomCode.trim().toUpperCase();
        const result = roomManager.joinRoom(cleanCode, {
          socketId: socket.id,
          userId: payload.userId,
          username: payload.username,
        });

        if (result.error || !result.room) {
          callback?.({ success: false, error: result.error || 'Failed to join room.' });
          return;
        }

        socket.join(cleanCode);
        console.log(
          `Player ${payload.username} joined table ${cleanCode} (reconnected: ${result.reconnected})`
        );

        // Broadcast to everyone in the room that player state is updated
        io.to(cleanCode).emit('room:updated', result.room);

        // If game is in progress, send current game state:
        // - to the reconnecting player individually (they need their hole cards)
        // - also re-broadcast to all players so everyone re-syncs (fixes stale state after peer reconnect)
        if (result.room.status === 'in_progress') {
          const engine = roomManager.getEngine(cleanCode);
          if (engine) {
            // Send the reconnecting player their personalised state first
            socket.emit('game:state', engine.getClientState(payload.userId));
            if (result.reconnected) {
              // Re-broadcast to all others so their view is also up-to-date
              broadcastGameState(io, cleanCode);
            }
          }
        }

        // Only announce if this was a fresh join, not a page refresh
        if (!result.reconnected) {
          io.to(cleanCode).emit('room:announcement', {
            type: 'join',
            message: `${payload.username} took a seat at the table.`,
            timestamp: Date.now(),
          });
        }

        // Update public room list
        io.emit('rooms:list', roomManager.getActiveRooms());

        callback?.({ success: true, room: result.room });
      } catch (err) {
        console.error('Error joining room:', err);
        callback?.({ success: false, error: 'Failed to join room.' });
      }
    }
  );

  // Leave room (Explicit exit)
  socket.on(
    'room:leave',
    (
      payload: { roomCode: string; userId: string },
      callback?: (res: { success: boolean; roomClosed?: boolean }) => void
    ) => {
      try {
        const cleanCode = payload.roomCode.trim().toUpperCase();
        const res = roomManager.leaveRoom(cleanCode, payload.userId);

        socket.leave(cleanCode);

        if (res.removedPlayer) {
          console.log(`Player ${res.removedPlayer.username} left table ${cleanCode}`);

          if (res.roomClosed) {
            // Game master left or last player left -> table is discarded!
            console.log(`Table ${cleanCode} discarded because host left.`);
            io.to(cleanCode).emit('room:closed', {
              reason: 'The Game Master has closed the table.',
            });
          } else if (res.room) {
            // Regular player left -> update remaining players
            io.to(cleanCode).emit('room:updated', res.room);
            io.to(cleanCode).emit('room:announcement', {
              type: 'leave',
              message: `${res.removedPlayer.username} stood up from the table.`,
              timestamp: Date.now(),
            });

            if (res.room.status === 'in_progress') {
              broadcastGameState(io, cleanCode);
            }
          }
        }

        io.emit('rooms:list', roomManager.getActiveRooms());
        callback?.({ success: true, roomClosed: res.roomClosed });
      } catch (err) {
        console.error('Error leaving room:', err);
        callback?.({ success: false });
      }
    }
  );

  // Toggle ready status
  socket.on('room:toggle_ready', (payload: { roomCode: string; userId: string }) => {
    const room = roomManager.toggleReady(payload.roomCode, payload.userId);
    if (room) {
      io.to(room.code).emit('room:updated', room);
    }
  });

  // Query current room state
  socket.on('room:get_state', (roomCode: string, callback?: (room?: Room) => void) => {
    const room = roomManager.getRoom(roomCode);
    callback?.(room);
  });

  // Query active rooms
  socket.on('rooms:get_active', (callback?: (rooms: Room[]) => void) => {
    callback?.(roomManager.getActiveRooms());
  });

  // --- GAME ENGINE EVENTS ---

  // Game Master starts the hand
  socket.on(
    'game:start',
    (
      payload: { roomCode: string; userId: string },
      callback?: (res: { success: boolean; error?: string }) => void
    ) => {
      try {
        const cleanCode = payload.roomCode.trim().toUpperCase();
        const res = roomManager.startGame(cleanCode, payload.userId);
        if (!res.success || !res.engine) {
          callback?.({ success: false, error: res.error || 'Failed to start game.' });
          return;
        }

        const room = roomManager.getRoom(cleanCode);
        if (room) {
          io.to(cleanCode).emit('room:updated', room);
        }

        broadcastGameState(io, cleanCode);

        io.to(cleanCode).emit('room:announcement', {
          type: 'game',
          message: `The Game Master dealt the cards. Hand #${res.engine.handNumber} begins!`,
          timestamp: Date.now(),
        });

        callback?.({ success: true });
      } catch (err) {
        console.error('Error in game:start:', err);
        callback?.({ success: false, error: 'Internal error starting game.' });
      }
    }
  );

  // Player action (fold, check, call, raise, all-in)
  socket.on(
    'game:action',
    (
      payload: {
        roomCode: string;
        userId: string;
        action: PlayerActionType;
        amount?: number;
      },
      callback?: (res: { success: boolean; error?: string }) => void
    ) => {
      try {
        const cleanCode = payload.roomCode.trim().toUpperCase();
        const room = roomManager.getRoom(cleanCode);
        const engine = roomManager.getEngine(cleanCode);

        if (!room || !engine) {
          callback?.({ success: false, error: 'Game table not found.' });
          return;
        }

        const actingPlayer = engine.players.find((p) => p.userId === payload.userId);
        if (!actingPlayer) {
          callback?.({ success: false, error: 'Player is not seated in this game.' });
          return;
        }

        const result = engine.handlePlayerAction(
          payload.userId,
          payload.action,
          payload.amount
        );

        if (!result.success) {
          callback?.({ success: false, error: result.error || 'Invalid action.' });
          return;
        }

        // Broadcast player action announcement
        let actionDesc = `${actingPlayer.username} ${payload.action}ed.`;
        if (payload.action === 'fold') {
          actionDesc = `${actingPlayer.username} folded.`;
        } else if (payload.action === 'check') {
          actionDesc = `${actingPlayer.username} checked.`;
        } else if (payload.action === 'call') {
          actionDesc = `${actingPlayer.username} called.`;
        } else if (payload.action === 'raise') {
          actionDesc = `${actingPlayer.username} raised to ₹${engine.currentHighestBet}.`;
        } else if (payload.action === 'all-in') {
          actionDesc = `${actingPlayer.username} shoved ALL-IN!`;
        }

        io.to(cleanCode).emit('room:announcement', {
          type: 'action',
          message: actionDesc,
          timestamp: Date.now(),
        });

        // If hand ended, update room player chips & announce winners
        if (engine.round === 'showdown' && engine.showdownResult) {
          roomManager.syncChipsFromEngine(cleanCode);
          io.to(cleanCode).emit('room:updated', room);

          for (const winner of engine.showdownResult.winners) {
            io.to(cleanCode).emit('room:announcement', {
              type: 'winner',
              message: `🏆 ${winner.username} won ₹${winner.amountWon} (${winner.handDescription})!`,
              timestamp: Date.now(),
            });
          }
        }

        broadcastGameState(io, cleanCode);
        callback?.({ success: true });
      } catch (err) {
        console.error('Error in game:action:', err);
        callback?.({ success: false, error: 'Internal error processing action.' });
      }
    }
  );

  // Game Master deals next hand
  socket.on(
    'game:next_hand',
    (
      payload: { roomCode: string; userId: string },
      callback?: (res: { success: boolean; error?: string }) => void
    ) => {
      try {
        const cleanCode = payload.roomCode.trim().toUpperCase();
        const res = roomManager.nextHand(cleanCode, payload.userId);
        if (!res.success || !res.engine) {
          callback?.({ success: false, error: res.error || 'Failed to deal next hand.' });
          return;
        }

        const room = roomManager.getRoom(cleanCode);
        if (room) {
          io.to(cleanCode).emit('room:updated', room);
        }

        broadcastGameState(io, cleanCode);

        io.to(cleanCode).emit('room:announcement', {
          type: 'game',
          message: `Hand #${res.engine.handNumber} dealt. Good luck!`,
          timestamp: Date.now(),
        });

        callback?.({ success: true });
      } catch (err) {
        console.error('Error in game:next_hand:', err);
        callback?.({ success: false, error: 'Internal error dealing next hand.' });
      }
    }
  );

  // Fetch client game state directly
  socket.on(
    'game:get_state',
    (
      payload: { roomCode: string; userId: string },
      callback?: (res: { success: boolean; state?: any; error?: string }) => void
    ) => {
      const cleanCode = payload.roomCode.trim().toUpperCase();
      const engine = roomManager.getEngine(cleanCode);
      if (engine) {
        callback?.({ success: true, state: engine.getClientState(payload.userId) });
      } else {
        callback?.({ success: false, error: 'No active game found.' });
      }
    }
  );

  // Game Master ends session and calculates settlements
  socket.on(
    'game:end',
    async (
      payload: { roomCode: string; userId: string },
      callback?: (res: { success: boolean; result?: any; error?: string }) => void
    ) => {
      try {
        const cleanCode = payload.roomCode.trim().toUpperCase();
        const res = await roomManager.endGame(cleanCode, payload.userId);
        if (!res.success || !res.result) {
          callback?.({ success: false, error: res.error || 'Failed to end session.' });
          return;
        }

        const room = roomManager.getRoom(cleanCode);
        if (room) {
          io.to(cleanCode).emit('room:updated', room);
        }

        io.to(cleanCode).emit('game:ended', res.result);

        io.to(cleanCode).emit('room:announcement', {
          type: 'settlement',
          message: 'The Game Master concluded the session. Final scoreboard and debts settled!',
          timestamp: Date.now(),
        });

        callback?.({ success: true, result: res.result });
      } catch (err) {
        console.error('Error in game:end:', err);
        callback?.({ success: false, error: 'Internal error ending session.' });
      }
    }
  );

  // Handle socket disconnect with grace period
  socket.on('disconnect', () => {
    roomManager.handleSocketDisconnect(socket.id, (info) => {
      if (info.roomClosed) {
        io.to(info.roomCode).emit('room:closed', {
          reason: 'The Game Master has disconnected and closed the table.',
        });
      } else if (info.room) {
        io.to(info.roomCode).emit('room:updated', info.room);
        io.to(info.roomCode).emit('room:announcement', {
          type: 'leave',
          message: `${info.removedPlayer.username} left the table.`,
          timestamp: Date.now(),
        });

        // CRITICAL: Always broadcast fresh game state after a player is removed mid-hand.
        // Without this, other clients stay frozen showing the disconnected player's turn.
        if (info.room.status === 'in_progress') {
          broadcastGameState(io, info.roomCode);
        }
      }
      io.emit('rooms:list', roomManager.getActiveRooms());
    });
  });
}

