'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  ArrowRight,
  Users,
  Coins,
  Shield,
  RotateCw,
  LogIn,
  KeyRound,
  X,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { fetchActiveRooms, Room } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { formatChips } from '@/lib/utils';

export default function LobbyHubPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [activeRooms, setActiveRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);

  // Host modal state
  const [isHostModalOpen, setIsHostModalOpen] = useState(false);
  const [tableName, setTableName] = useState('');
  const [startingChips, setStartingChips] = useState('1000');
  const [smallBlind, setSmallBlind] = useState('10');
  const [bigBlind, setBigBlind] = useState('20');
  const [hosting, setHosting] = useState(false);
  const [hostError, setHostError] = useState<string | null>(null);

  const loadRooms = async () => {
    setLoadingRooms(true);
    try {
      const rooms = await fetchActiveRooms();
      setActiveRooms(rooms);
    } catch (e) {
      console.warn('Could not load active rooms', e);
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    loadRooms();

    // Listen to real-time room list broadcasts
    const socket = getSocket();
    const handleRoomsList = (rooms: Room[]) => {
      setActiveRooms(rooms);
    };

    socket.on('rooms:list', handleRoomsList);
    return () => {
      socket.off('rooms:list', handleRoomsList);
    };
  }, []);

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    const clean = joinCode.trim().toUpperCase();
    if (!clean) {
      setJoinError('Please enter a table code.');
      return;
    }
    if (clean.length < 4 || clean.length > 8) {
      setJoinError('Table code must be between 4 and 8 characters.');
      return;
    }
    router.push(`/lobby/${clean}`);
  };

  const handleHostTable = (e: React.FormEvent) => {
    e.preventDefault();
    setHostError(null);

    if (!user) {
      router.push('/login?redirect=/lobby');
      return;
    }

    setHosting(true);
    const socket = getSocket();

    socket.emit(
      'room:create',
      {
        userId: user.id,
        username: user.username,
        name: tableName.trim() || undefined,
        startingChips: parseInt(startingChips, 10) || 1000,
        smallBlind: parseInt(smallBlind, 10) || 10,
        bigBlind: parseInt(bigBlind, 10) || 20,
      },
      (res: { success: boolean; room?: Room; error?: string }) => {
        setHosting(false);
        if (res.success && res.room) {
          router.push(`/lobby/${res.room.code}`);
        } else {
          setHostError(res.error || 'Failed to host table.');
        }
      }
    );
  };

  return (
    <div className="min-h-screen bg-parchment-100 text-espresso flex flex-col font-sans">
      {/* Masthead Header */}
      <header className="border-b border-border/80 bg-parchment-50/90 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-[9px] sm:text-[10px] tracking-[0.25em] uppercase font-serif text-espresso-muted">
              Private Texas Hold&apos;em
            </div>
            <Link
              href="/"
              className="font-serif text-lg sm:text-2xl tracking-tight text-espresso font-normal flex items-center gap-1.5 sm:gap-2 hover:opacity-90 truncate"
            >
              <span className="text-felt text-lg sm:text-xl shrink-0">♠</span>
              <span>The Card Room</span>
            </Link>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            <Link href="/">
              <Button variant="outline" size="sm" className="text-xs px-2.5 sm:px-3">
                ← <span className="hidden sm:inline">Club </span>Ledger
              </Button>
            </Link>
            {user ? (
              <Link href="/profile">
                <Button variant="secondary" size="sm" className="text-xs font-serif px-2.5 sm:px-3">
                  <span>♠ </span><span className="hidden sm:inline">{user.username}</span>
                </Button>
              </Link>
            ) : (
              <Link href="/login?redirect=/lobby">
                <Button variant="poker" size="sm" className="text-xs gap-1.5 px-2.5 sm:px-3">
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Sign In</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Hub Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 w-full space-y-6 sm:space-y-8">
        {/* Hub Masthead */}
        <div className="text-center space-y-1 sm:space-y-1.5 py-1 sm:py-2">
          <h2 className="font-serif text-2xl sm:text-3xl font-normal text-espresso">Game Room Hub</h2>
          <p className="font-serif italic text-xs sm:text-sm text-espresso-muted">
            Host a private table for your circle or enter an invite code to take a seat.
          </p>
        </div>

        {/* Action Row: Host Table & Join by Code */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Host Table Card */}
          <Card className="border-border shadow-classic flex flex-col justify-between">
            <CardHeader>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm bg-felt/10 text-felt text-xs font-serif border border-felt/20 w-fit mb-1">
                <span>♠ Game Master</span>
              </div>
              <CardTitle className="text-xl">Host Private Table</CardTitle>
              <CardDescription>
                Create a table, set blinds &amp; starting chips, and receive a shareable
                invite code.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <Button
                variant="poker"
                className="w-full text-xs font-serif gap-2 h-10"
                onClick={() => {
                  if (!user) {
                    router.push('/login?redirect=/lobby');
                  } else {
                    setIsHostModalOpen(true);
                  }
                }}
              >
                <Plus className="h-4 w-4" />
                <span>Configure &amp; Host Table</span>
              </Button>
            </CardContent>
          </Card>

          {/* Join by Code Card */}
          <Card className="border-border shadow-classic flex flex-col justify-between">
            <CardHeader>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm bg-brass/15 text-brass-dark text-xs font-serif border border-brass/30 w-fit mb-1">
                <KeyRound className="h-3 w-3" />
                <span>Invite Code</span>
              </div>
              <CardTitle className="text-xl">Join Existing Table</CardTitle>
              <CardDescription>
                Enter the 5-character table code provided by your game master.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <form onSubmit={handleJoinByCode} className="space-y-3">
                {joinError && (
                  <div className="p-2 rounded text-xs bg-wine/10 border border-wine/25 text-wine flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{joinError}</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. ROYAL"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={8}
                    className="font-mono tracking-widest uppercase text-center text-base font-semibold"
                  />
                  <Button type="submit" variant="brass" className="text-xs shrink-0 px-4">
                    <span>Enter</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Active Tables List */}
        <Card className="border-border shadow-classic">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-lg">Open Waiting Tables</CardTitle>
              <CardDescription>
                Tables currently waiting for players before cards are dealt
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadRooms}
              disabled={loadingRooms}
              className="text-xs gap-1"
            >
              <RotateCw className={`h-3 w-3 ${loadingRooms ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </CardHeader>
          <CardContent>
            {activeRooms.length === 0 ? (
              <div className="py-12 text-center text-espresso-muted font-serif text-sm space-y-1">
                <p>No open tables currently waiting.</p>
                <p className="text-xs italic">
                  Click &ldquo;Configure &amp; Host Table&rdquo; above to start a game.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {activeRooms.map((room) => (
                  <div
                    key={room.code}
                    className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-serif font-semibold text-espresso">
                          {room.name}
                        </span>
                        <Badge
                          variant="outline"
                          className="font-mono text-xs font-bold tracking-wider"
                        >
                          {room.code}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-espresso-muted font-serif">
                        <span className="flex items-center gap-1">
                          <Shield className="h-3 w-3 text-felt" />
                          Master: {room.gameMasterUsername}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {room.players.length}/{room.config.maxPlayers} Seated
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Coins className="h-3 w-3 text-brass" />
                          Blinds: {formatChips(room.config.smallBlind)}/
                          {formatChips(room.config.bigBlind)}
                        </span>
                      </div>
                    </div>

                    <Link href={`/lobby/${room.code}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs font-serif w-full sm:w-auto"
                      >
                        <span>Take a Seat</span>
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Host Table Configuration Modal */}
      {isHostModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso/30 backdrop-blur-xs"
        >
          <div className="bg-parchment-50 border border-border shadow-paper rounded-lg max-w-md w-full p-4 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div>
                <h3 className="font-serif text-lg font-normal text-espresso">
                  Host Private Table
                </h3>
                <p className="text-xs text-espresso-muted font-serif">
                  Configure starting chip stacks and table limits
                </p>
              </div>
              <button
                onClick={() => setIsHostModalOpen(false)}
                className="text-espresso-muted hover:text-espresso p-1"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {hostError && (
              <div className="p-2.5 rounded text-xs bg-wine/10 border border-wine/20 text-wine flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{hostError}</span>
              </div>
            )}

            <form onSubmit={handleHostTable} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-serif text-espresso font-medium">Table Name</label>
                <Input
                  placeholder={user ? `${user.username}'s Table` : 'Friday Night Poker'}
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="font-serif text-espresso font-medium">
                    Starting Chips
                  </label>
                  <Input
                    type="number"
                    min="100"
                    step="50"
                    value={startingChips}
                    onChange={(e) => setStartingChips(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-serif text-espresso font-medium">
                    Small Blind
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={smallBlind}
                    onChange={(e) => setSmallBlind(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-serif text-espresso font-medium">
                    Big Blind
                  </label>
                  <Input
                    type="number"
                    min="2"
                    value={bigBlind}
                    onChange={(e) => setBigBlind(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="p-3 rounded bg-parchment-200/60 border border-border/70 text-espresso-muted font-serif text-[11px] space-y-1">
                <p className="font-semibold text-espresso">Game Master Privileges:</p>
                <p>
                  • As host, you can start the round once at least 2 players have joined.
                </p>
                <p>
                  • You will have the master control to end the game and settle debts.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsHostModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="poker" size="sm" disabled={hosting}>
                  {hosting ? 'Opening Table...' : 'Open Table'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-border/70 py-6 text-center text-xs font-serif text-espresso-muted">
        The Card Room • Private Texas Hold&apos;em Club • Phase 3 Room Management
      </footer>
    </div>
  );
}
