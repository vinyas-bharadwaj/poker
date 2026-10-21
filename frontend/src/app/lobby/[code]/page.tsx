'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Users,
  Copy,
  Check,
  Shield,
  Coins,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Play,
  LogOut,
  AlertCircle,
  RotateCw,
  Flag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { getSocket } from '@/lib/socket';
import { Room } from '@/lib/api';
import { ClientGameState, PlayerActionType, EndGameResult } from '@/lib/gameTypes';
import { PokerTable } from '@/components/poker/PokerTable';
import { SettlementModal } from '@/components/poker/SettlementModal';
import { formatChips } from '@/lib/utils';

interface Announcement {
  id: string;
  message: string;
  timestamp: number;
}

export default function TableLobbyPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = ((params?.code as string) || '').toUpperCase();

  const { user, loading: authLoading } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [settlement, setSettlement] = useState<EndGameResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [roomClosedNotice, setRoomClosedNotice] = useState<string | null>(null);

  // Route protection: Must be authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/login?redirect=/lobby/${roomCode}`);
    }
  }, [user, authLoading, router, roomCode]);

  // Connect to room via Socket.io
  useEffect(() => {
    if (!user || !roomCode) return;

    const socket = getSocket();

    const joinTheRoom = () => {
      setLoading(true);
      setError(null);

      socket.emit(
        'room:join',
        {
          roomCode,
          userId: user.id,
          username: user.username,
        },
        (res: { success: boolean; room?: Room; error?: string }) => {
          setLoading(false);
          if (res.success && res.room) {
            setRoom(res.room);

            // If room is settled, check for settlement
            if (res.room.status === 'settled' && (res.room as unknown as { settlement?: EndGameResult }).settlement) {
              setSettlement((res.room as unknown as { settlement: EndGameResult }).settlement);
            }

            // If already in progress, fetch game state
            if (res.room.status === 'in_progress') {
              socket.emit(
                'game:get_state',
                { roomCode, userId: user.id },
                (stateRes: { success: boolean; state?: ClientGameState }) => {
                  if (stateRes?.success && stateRes.state) {
                    setGameState(stateRes.state);
                  }
                }
              );
            }
          } else {
            setError(res.error || `Unable to join table ${roomCode}.`);
          }
        }
      );
    };

    if (socket.connected) {
      joinTheRoom();
    } else {
      socket.once('connect', joinTheRoom);
    }

    // Listen to real-time room updates
    const handleRoomUpdated = (updatedRoom: Room) => {
      if (updatedRoom.code === roomCode) {
        setRoom({ ...updatedRoom });
        if (updatedRoom.status === 'settled' && (updatedRoom as unknown as { settlement?: EndGameResult }).settlement) {
          setSettlement((updatedRoom as unknown as { settlement: EndGameResult }).settlement);
        }
      }
    };

    // Listen to real-time game state updates
    const handleGameState = (state: ClientGameState) => {
      if (state.roomCode === roomCode) {
        setGameState(state);
      }
    };

    // Listen to game ended / session settlement
    const handleGameEnded = (result: EndGameResult) => {
      if (result.roomCode === roomCode) {
        setSettlement(result);
      }
    };

    // Listen for room closure (when Game Master exits)
    const handleRoomClosed = (data: { reason?: string }) => {
      setRoomClosedNotice(
        data.reason || 'The Game Master has exited and discarded the table.'
      );
      setTimeout(() => {
        router.push('/lobby');
      }, 2500);
    };

    const handleAnnouncement = (ann: { message: string; timestamp: number }) => {
      setAnnouncements((prev) => [
        {
          id: `${Date.now()}-${Math.random()}`,
          message: ann.message,
          timestamp: ann.timestamp,
        },
        ...prev.slice(0, 19),
      ]);
    };

    socket.on('room:updated', handleRoomUpdated);
    socket.on('room:closed', handleRoomClosed);
    socket.on('room:announcement', handleAnnouncement);
    socket.on('game:state', handleGameState);
    socket.on('game:ended', handleGameEnded);

    return () => {
      socket.off('room:updated', handleRoomUpdated);
      socket.off('room:closed', handleRoomClosed);
      socket.off('room:announcement', handleAnnouncement);
      socket.off('game:state', handleGameState);
      socket.off('game:ended', handleGameEnded);
    };
  }, [user, roomCode, router]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn('Copy clipboard failed', e);
    }
  };

  const handleToggleReady = () => {
    if (!user || !room) return;
    const socket = getSocket();
    socket.emit('room:toggle_ready', { roomCode: room.code, userId: user.id });
  };

  const handleLeaveTable = () => {
    if (!user || !room) return;
    const socket = getSocket();
    socket.emit('room:leave', { roomCode: room.code, userId: user.id }, () => {
      router.push('/lobby');
    });
  };

  const handleStartGame = () => {
    if (!user || !room) return;
    setActionLoading(true);
    const socket = getSocket();
    socket.emit(
      'game:start',
      { roomCode: room.code, userId: user.id },
      (res: { success: boolean; error?: string }) => {
        setActionLoading(false);
        if (!res.success && res.error) {
          alert(res.error);
        }
      }
    );
  };

  const handlePlayerAction = (action: PlayerActionType, amount?: number) => {
    if (!user || !room) return;
    setActionLoading(true);
    const socket = getSocket();
    socket.emit(
      'game:action',
      {
        roomCode: room.code,
        userId: user.id,
        action,
        amount,
      },
      (res: { success: boolean; error?: string }) => {
        setActionLoading(false);
        if (!res.success && res.error) {
          alert(res.error);
        }
      }
    );
  };

  const handleNextHand = () => {
    if (!user || !room) return;
    setActionLoading(true);
    const socket = getSocket();
    socket.emit(
      'game:next_hand',
      { roomCode: room.code, userId: user.id },
      (res: { success: boolean; error?: string }) => {
        setActionLoading(false);
        if (!res.success && res.error) {
          alert(res.error);
        }
      }
    );
  };

  const handleEndGame = () => {
    if (!user || !room) return;
    setActionLoading(true);
    const socket = getSocket();
    socket.emit(
      'game:end',
      { roomCode: room.code, userId: user.id },
      (res: { success: boolean; result?: EndGameResult; error?: string }) => {
        setActionLoading(false);
        if (res.success && res.result) {
          setSettlement(res.result);
        } else if (res.error) {
          alert(res.error);
        }
      }
    );
  };

  if (authLoading || (loading && !room && !error)) {
    return (
      <div className="min-h-screen bg-parchment-100 flex items-center justify-center">
        <div className="text-center font-serif text-espresso-muted space-y-2">
          <RotateCw className="h-5 w-5 animate-spin mx-auto text-felt" />
          <p className="text-xs">Connecting to table {roomCode}...</p>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-parchment-100 flex flex-col items-center justify-center px-4">
        <Card className="max-w-md w-full border-border shadow-classic text-center p-6 space-y-4">
          <AlertCircle className="h-8 w-8 text-wine mx-auto" />
          <h2 className="font-serif text-xl text-espresso">Table Unavailable</h2>
          <p className="text-xs text-espresso-muted font-serif">
            {error ||
              `Table code ${roomCode} was not found or has been closed by the host.`}
          </p>
          <Link href="/lobby">
            <Button variant="poker" size="sm" className="text-xs">
              Return to Game Rooms
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const isGameMaster = room.gameMasterId === user?.id;
  const currentPlayer = room.players.find((p) => p.userId === user?.id);
  const canStartGame = room.players.length >= 2;
  const isGameActive = room.status === 'in_progress' && gameState !== null;

  return (
    <div className="min-h-screen bg-parchment-100 text-espresso flex flex-col font-sans">
      {/* Session Settlement Modal (when Game Master concludes session) */}
      {settlement && (
        <SettlementModal
          settlement={settlement}
          onClose={() => router.push('/lobby')}
        />
      )}

      {/* Table Disbanded Overlay Notification */}
      {roomClosedNotice && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso/40 backdrop-blur-xs"
        >
          <div className="bg-parchment-50 border border-wine/40 shadow-paper rounded-lg max-w-sm w-full p-6 text-center space-y-3 animate-in fade-in zoom-in-95">
            <AlertCircle className="h-8 w-8 text-wine mx-auto" />
            <h3 className="font-serif text-lg font-normal text-espresso">
              Table Disbanded
            </h3>
            <p className="text-xs text-espresso-muted font-serif">{roomClosedNotice}</p>
            <p className="text-[11px] text-espresso-muted italic font-serif">
              Returning to game rooms...
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-border/80 bg-parchment-50/90 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            <button
              onClick={handleLeaveTable}
              className="text-xs font-serif text-espresso-muted hover:text-espresso flex items-center gap-1 cursor-pointer transition-colors shrink-0"
              title="Leave Table"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Leave Table</span>
            </button>
            <span className="text-border hidden sm:inline">|</span>
            <div className="truncate min-w-0">
              <span className="font-serif text-sm sm:text-base font-normal text-espresso flex items-center gap-1.5 truncate">
                <span className="text-felt shrink-0">♠</span>
                <span className="truncate">{room.name}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyCode}
              className="text-xs font-mono tracking-wider gap-1 sm:gap-1.5 px-2 sm:px-3"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-felt" />
                  <span className="hidden sm:inline">COPIED</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-espresso-muted" />
                  <span><span className="hidden sm:inline">CODE: </span>{room.code}</span>
                </>
              )}
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleLeaveTable}
              className="text-xs text-wine hover:text-wine-dark gap-1 cursor-pointer px-2 sm:px-3"
              title="Stand Up / Exit"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Stand Up</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Table Content */}
      <main className="max-w-5xl mx-auto px-2 sm:px-6 py-4 sm:py-6 flex-1 w-full space-y-4 sm:space-y-6">
        {/* Table Specifications Bar */}
        <div className="rounded-lg border border-border bg-parchment-50 p-2.5 sm:p-3.5 shadow-classic flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 text-xs font-serif text-espresso">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${
                  room.status === 'settled'
                    ? 'bg-wine'
                    : isGameActive
                    ? 'bg-felt'
                    : 'bg-brass'
                } animate-pulse`}
              />
              <span className="font-semibold">
                {room.status === 'settled'
                  ? 'Session Settled'
                  : isGameActive
                  ? 'Hand in Progress'
                  : 'Table Waiting'}
              </span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1 text-espresso-muted">
              <Coins className="h-3.5 w-3.5 text-brass" />
              <span>
                Blinds:{' '}
                <strong className="text-espresso">
                  {formatChips(room.config.smallBlind)} / {formatChips(room.config.bigBlind)}
                </strong>
              </span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1 text-espresso-muted">
              <Shield className="h-3.5 w-3.5 text-felt" />
              <span>
                Host: <strong className="text-espresso">{room.gameMasterUsername}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-serif text-xs">
              {room.players.length} of {room.config.maxPlayers} Seats
            </Badge>

            {isGameMaster && isGameActive && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEndGame}
                disabled={actionLoading}
                className="text-[11px] text-wine hover:text-wine-dark hover:bg-wine/10 border-wine/30 h-6 px-2 gap-1 font-serif cursor-pointer"
              >
                <Flag className="h-3 w-3" />
                <span>End Game</span>
              </Button>
            )}
          </div>
        </div>

        {/* View Mode: Active Game Table vs. Waiting Room */}
        {isGameActive ? (
          <PokerTable
            gameState={gameState}
            currentUserId={user?.id || ''}
            isGameMaster={isGameMaster}
            onAction={handlePlayerAction}
            onNextHand={handleNextHand}
            onEndGame={handleEndGame}
            actionLoading={actionLoading}
          />
        ) : (
          /* Waiting Room View */
          <div className="space-y-6">
            {/* Seated Players Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-lg font-normal text-espresso flex items-center gap-2">
                  <Users className="h-4 w-4 text-felt" />
                  Seated Players
                </h3>
                <span className="text-xs font-serif text-espresso-muted">
                  Waiting for game start
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {room.players.map((player, idx) => {
                  const isYou = player.userId === user?.id;
                  return (
                    <div
                      key={player.userId}
                      className={`rounded-lg border p-4 transition-all relative flex flex-col justify-between ${
                        isYou
                          ? 'bg-parchment-50 border-felt/40 shadow-paper'
                          : 'bg-parchment-50 border-border/80 shadow-classic'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-espresso-muted">
                            Seat {idx + 1}
                          </span>
                          {player.isGameMaster && (
                            <Badge
                              variant="brass"
                              className="text-[10px] py-0 px-1.5 font-serif gap-1"
                            >
                              <Shield className="h-2.5 w-2.5" />
                              Master
                            </Badge>
                          )}
                        </div>

                        <div>
                          <div className="font-serif font-semibold text-base text-espresso flex items-center gap-1.5">
                            <span className="text-felt">♠</span>
                            <span className="truncate">{player.username}</span>
                            {isYou && (
                              <span className="text-[10px] font-sans font-normal text-espresso-muted">
                                (You)
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-mono text-espresso-muted mt-0.5">
                            Chips: {formatChips(player.chips)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-serif text-espresso-muted">
                          Status:
                        </span>
                        {player.isGameMaster ? (
                          <span className="text-felt font-serif text-xs font-semibold flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Host Ready
                          </span>
                        ) : player.isReady ? (
                          <span className="text-felt font-serif text-xs font-semibold flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Ready
                          </span>
                        ) : (
                          <span className="text-espresso-muted font-serif text-xs flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Waiting
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Empty seat placeholders */}
                {Array.from({
                  length: Math.max(0, room.config.maxPlayers - room.players.length),
                }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="rounded-lg border border-dashed border-border/80 p-4 flex flex-col items-center justify-center text-center min-h-[120px] text-espresso-muted/60"
                  >
                    <span className="font-serif text-xs italic">Seat Open</span>
                    <span className="text-[10px] text-espresso-muted/40 font-mono mt-1">
                      Waiting for invite
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Game Master Action Bar / Player Readiness */}
            <Card className="border-border shadow-classic">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-center sm:text-left">
                    <h4 className="font-serif text-base font-normal text-espresso">
                      {isGameMaster ? 'Game Master Control' : 'Player Readiness'}
                    </h4>
                    <p className="text-xs text-espresso-muted font-serif">
                      {isGameMaster
                        ? canStartGame
                          ? 'All requirements met. You may begin the session whenever players are settled.'
                          : 'Invite at least one more player to enable dealing.'
                        : currentPlayer?.isReady
                          ? 'You are marked ready. Waiting for the Game Master to deal.'
                          : 'Mark yourself ready when you are prepared to play.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-center">
                    {!isGameMaster && (
                      <Button
                        variant={currentPlayer?.isReady ? 'outline' : 'poker'}
                        size="sm"
                        onClick={handleToggleReady}
                        className="text-xs font-serif cursor-pointer w-full sm:w-auto"
                      >
                        {currentPlayer?.isReady ? 'Unmark Ready' : 'Mark Ready'}
                      </Button>
                    )}

                    {isGameMaster && (
                      <Button
                        variant="brass"
                        size="lg"
                        disabled={!canStartGame || actionLoading}
                        onClick={handleStartGame}
                        className="text-xs font-serif gap-2 px-6 shadow-sm cursor-pointer w-full sm:w-auto"
                      >
                        <Play className="h-4 w-4 fill-espresso" />
                        <span>Deal Cards &amp; Start</span>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Live Table Activity Ticker */}
        {announcements.length > 0 && (
          <div className="rounded-lg border border-border/80 bg-parchment-50 p-4 space-y-2 text-xs font-serif shadow-sm">
            <div className="text-[10px] uppercase tracking-wider text-espresso-muted font-mono">
              Table Activity
            </div>
            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-2">
              {announcements.map((ann) => (
                <div
                  key={ann.id}
                  className="flex items-center justify-between text-espresso-muted"
                >
                  <span className="text-espresso font-medium">• {ann.message}</span>
                  <span className="text-[10px] font-mono text-espresso-muted/60">
                    {new Date(ann.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/70 py-4 text-center text-xs font-serif text-espresso-muted">
        The Card Room • Private Texas Hold&apos;em Table • Code: {room.code}
      </footer>
    </div>
  );
}
