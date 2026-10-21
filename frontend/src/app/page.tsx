'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Trophy,
  History,
  CheckCircle2,
  RotateCw,
  Coins,
  TrendingUp,
  TrendingDown,
  User as UserIcon,
  LogOut,
  LogIn,
  UserPlus,
  ArrowRight,
  Search,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  fetchHealth,
  fetchUsers,
  fetchGames,
  fetchStats,
  User,
  GameRecord,
  HealthResponse,
  StatsResponse,
} from '@/lib/api';
import { formatChips } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { user: authUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'ledger' | 'history'>('ledger');
  const [ledgerSort, setLedgerSort] = useState<'winners' | 'losers' | 'winnings' | 'losses'>('winners');
  const [searchQuery, setSearchQuery] = useState('');
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [games, setGames] = useState<GameRecord[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [healthData, usersData, gamesData, statsData] = await Promise.all([
        fetchHealth().catch(() => null),
        fetchUsers().catch(() => []),
        fetchGames().catch(() => []),
        fetchStats().catch(() => null),
      ]);

      if (healthData) setHealth(healthData);
      setUsers(usersData);
      setGames(gamesData);
      if (statsData) setStats(statsData);
    } catch (err: any) {
      console.error('Data load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const sortedUsers = React.useMemo(() => {
    const list = users.map((u) => ({
      ...u,
      net: u.lifetimeWinnings - u.lifetimeLosses,
    }));

    const filtered = searchQuery.trim()
      ? list.filter(
          (u) =>
            u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : list;

    if (ledgerSort === 'losers') {
      // Lowest net balance / highest deficit first (biggest loser at top)
      return [...filtered].sort((a, b) => a.net - b.net);
    } else if (ledgerSort === 'winnings') {
      return [...filtered].sort((a, b) => b.lifetimeWinnings - a.lifetimeWinnings);
    } else if (ledgerSort === 'losses') {
      return [...filtered].sort((a, b) => b.lifetimeLosses - a.lifetimeLosses);
    } else {
      // 'winners' default: Highest net profit first (biggest winner at top)
      return [...filtered].sort((a, b) => b.net - a.net);
    }
  }, [users, ledgerSort, searchQuery]);

  return (
    <div className="min-h-screen bg-parchment-100 text-espresso flex flex-col font-sans">
      {/* Masthead Header */}
      <header className="border-b border-border/80 bg-parchment-50/90 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-[9px] sm:text-[10px] tracking-[0.25em] uppercase font-serif text-espresso-muted">
              Private Texas Hold&apos;em
            </div>
            <h1 className="font-serif text-lg sm:text-2xl tracking-tight text-espresso font-normal flex items-center gap-1.5 sm:gap-2 truncate">
              <span className="text-felt text-lg sm:text-xl shrink-0">♠</span>
              <span>The Card Room</span>
            </h1>
          </div>

          <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
            {health?.database.status === 'connected' ? (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-felt font-serif px-2.5 py-1 rounded bg-felt/5 border border-felt/20">
                <span className="h-1.5 w-1.5 rounded-full bg-felt" />
                Ledger Connected
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-wine font-serif px-2.5 py-1 rounded bg-wine/5 border border-wine/20">
                <span className="h-1.5 w-1.5 rounded-full bg-wine" />
                Offline
              </span>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              title="Refresh ledger"
              className="text-xs px-2.5 sm:px-3"
            >
              <RotateCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>

            <Link href="/lobby">
              <Button variant="poker" size="sm" className="text-xs font-serif gap-1 sm:gap-1.5 px-2.5 sm:px-3">
                <span>♠ Tables</span>
              </Button>
            </Link>

            {/* Auth Buttons */}
            {authUser ? (
              <div className="flex items-center space-x-1 sm:space-x-2">
                <Link href="/profile">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1 sm:gap-1.5 font-serif px-2.5 sm:px-3"
                  >
                    <UserIcon className="h-3.5 w-3.5 text-felt" />
                    <span className="hidden sm:inline">{authUser.username}</span>
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  title="Sign out"
                  className="text-xs text-wine hover:text-wine-dark px-2 sm:px-3"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-1 sm:space-x-2">
                <Link href="/login">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1 sm:gap-1.5 font-serif px-2.5 sm:px-3"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Sign In</span>
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="poker" size="sm" className="text-xs gap-1 sm:gap-1.5 px-2.5 sm:px-3">
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>Join<span className="hidden sm:inline"> Club</span></span>
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 w-full space-y-6">
        {/* Serene Intro & Summary */}
        <div className="text-center py-2 sm:py-4 space-y-1">
          <p className="font-serif italic text-sm sm:text-base text-espresso-muted">
            &ldquo;Cards speak for themselves, gentleman.&rdquo;
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs font-serif text-espresso-muted pt-1">
            <span>{stats?.userCount ?? users.length} Members</span>
            <span>•</span>
            <span>{stats?.gameCount ?? games.length} Games Logged</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">Standard 52-Card Deck</span>
          </div>
        </div>

        {/* Quiet Classic Navigation Tabs */}
        <div className="flex justify-center border-b border-border/80">
          <div className="inline-flex space-x-8 text-sm font-serif">
            <button
              onClick={() => setActiveTab('ledger')}
              className={`pb-3 relative transition-colors ${
                activeTab === 'ledger'
                  ? 'text-felt font-semibold border-b-2 border-felt -mb-[1px]'
                  : 'text-espresso-muted hover:text-espresso'
              }`}
            >
              Member Standings
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-3 relative transition-colors cursor-pointer ${
                activeTab === 'history'
                  ? 'text-felt font-semibold border-b-2 border-felt -mb-[1px]'
                  : 'text-espresso-muted hover:text-espresso'
              }`}
            >
              Game History
            </button>
          </div>
        </div>

        {/* TAB 1: Member Standings */}
        {activeTab === 'ledger' && (
          <Card className="border-border shadow-classic">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Club Standings</CardTitle>
                <CardDescription>
                  Cumulative lifetime winnings, losses, and net ledger balances
                </CardDescription>
              </div>
              <Badge variant="outline" className="font-serif text-xs">
                {users.length} Registered
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {users.length === 0 ? (
                <div className="py-12 text-center text-espresso-muted font-serif text-sm">
                  No members recorded yet.{' '}
                  <Link
                    href="/register"
                    className="text-felt font-semibold hover:underline"
                  >
                    Register the first member here.
                  </Link>
                </div>
              ) : (
                <>
                  {/* Sorting & Filter Controls */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1 pb-1">
                    {/* Sort Selector Pills */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs font-serif">
                      <span className="text-espresso-muted mr-1">Sort by:</span>
                      <button
                        type="button"
                        onClick={() => setLedgerSort('winners')}
                        className={`px-2.5 py-1 rounded-md border text-xs font-serif transition-colors cursor-pointer flex items-center gap-1.5 ${
                          ledgerSort === 'winners'
                            ? 'bg-felt text-parchment-50 border-felt font-semibold shadow-xs'
                            : 'bg-parchment-100 hover:bg-parchment-200 text-espresso border-border'
                        }`}
                      >
                        <Trophy className="h-3 w-3 text-brass" />
                        <span><span className="hidden sm:inline">Biggest </span>Winners</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setLedgerSort('losers')}
                        className={`px-2.5 py-1 rounded-md border text-xs font-serif transition-colors cursor-pointer flex items-center gap-1.5 ${
                          ledgerSort === 'losers'
                            ? 'bg-wine text-parchment-50 border-wine font-semibold shadow-xs'
                            : 'bg-parchment-100 hover:bg-wine/10 text-wine border-border'
                        }`}
                      >
                        <TrendingDown className="h-3 w-3" />
                        <span><span className="hidden sm:inline">Biggest </span>Losers</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setLedgerSort('winnings')}
                        className={`px-2.5 py-1 rounded-md border text-xs font-serif transition-colors cursor-pointer ${
                          ledgerSort === 'winnings'
                            ? 'bg-parchment-300 text-espresso border-border font-semibold shadow-xs'
                            : 'bg-parchment-100 hover:bg-parchment-200 text-espresso-muted border-border'
                        }`}
                      >
                        <span><span className="hidden sm:inline">Gross </span>Won</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setLedgerSort('losses')}
                        className={`px-2.5 py-1 rounded-md border text-xs font-serif transition-colors cursor-pointer ${
                          ledgerSort === 'losses'
                            ? 'bg-parchment-300 text-espresso border-border font-semibold shadow-xs'
                            : 'bg-parchment-100 hover:bg-parchment-200 text-espresso-muted border-border'
                        }`}
                      >
                        <span><span className="hidden sm:inline">Gross </span>Lost</span>
                      </button>
                    </div>

                    {/* Quick Filter Search */}
                    <div className="relative w-full sm:w-48">
                      <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-espresso-muted pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Filter members..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1 bg-parchment-100 border border-border rounded-md text-xs font-serif text-espresso placeholder:text-espresso-muted/60 outline-none focus:border-felt"
                      />
                    </div>
                  </div>

                  {sortedUsers.length === 0 ? (
                    <div className="py-8 text-center text-espresso-muted font-serif text-xs italic">
                      No members matching &ldquo;{searchQuery}&rdquo;.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10 sm:w-12 text-center px-2 sm:px-4 text-xs">Rank</TableHead>
                          <TableHead className="px-2 sm:px-4 text-xs">Member</TableHead>
                          <TableHead className="hidden md:table-cell px-2 sm:px-4 text-xs">Email</TableHead>
                          <TableHead className="hidden sm:table-cell text-right px-2 sm:px-4 text-xs">Won</TableHead>
                          <TableHead className="hidden sm:table-cell text-right px-2 sm:px-4 text-xs">Lost</TableHead>
                          <TableHead className="text-right px-2 sm:px-4 text-xs">
                            <span className="sm:hidden">Net</span>
                            <span className="hidden sm:inline">Net Balance</span>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedUsers.map((user, idx) => {
                          const isCurrent = authUser?.id === user.id;
                          return (
                            <TableRow
                              key={user.id}
                              className={isCurrent ? 'bg-felt/5 font-medium' : ''}
                            >
                              <TableCell className="text-center font-mono text-xs px-2 sm:px-4">
                                {ledgerSort === 'winners' ? (
                                  user.net > 0 ? (
                                    idx === 0 ? (
                                      <span title="Club Champion (1st)" className="text-base select-none">🥇</span>
                                    ) : idx === 1 ? (
                                      <span title="Runner-up (2nd)" className="text-base select-none">🥈</span>
                                    ) : idx === 2 ? (
                                      <span title="Third place (3rd)" className="text-base select-none">🥉</span>
                                    ) : (
                                      <span className="text-espresso-muted">{idx + 1}.</span>
                                    )
                                  ) : (
                                    <span className="text-espresso-muted">{idx + 1}.</span>
                                  )
                                ) : ledgerSort === 'losers' ? (
                                  user.net < 0 ? (
                                    idx === 0 ? (
                                      <span title="#1 Biggest Deficit" className="text-base select-none">💸</span>
                                    ) : idx === 1 ? (
                                      <span title="#2 Deficit" className="text-base select-none">📉</span>
                                    ) : idx === 2 ? (
                                      <span title="#3 Deficit" className="text-base select-none">🥀</span>
                                    ) : (
                                      <span className="text-espresso-muted">{idx + 1}.</span>
                                    )
                                  ) : (
                                    <span className="text-espresso-muted">{idx + 1}.</span>
                                  )
                                ) : (
                                  <span className="text-espresso-muted">{idx + 1}.</span>
                                )}
                              </TableCell>
                              <TableCell className="font-serif font-medium text-espresso px-2 sm:px-4 text-xs sm:text-sm">
                                <span className="flex items-center gap-1.5">
                                  <span className="truncate max-w-[110px] sm:max-w-none">{user.username}</span>
                                  {isCurrent && (
                                    <Badge
                                      variant="default"
                                      className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0"
                                    >
                                      You
                                    </Badge>
                                  )}
                                </span>
                              </TableCell>
                              <TableCell className="hidden md:table-cell text-xs text-espresso-muted px-2 sm:px-4">
                                {user.email}
                              </TableCell>
                              <TableCell className="hidden sm:table-cell text-right text-felt font-mono text-xs font-medium px-2 sm:px-4">
                                {formatChips(user.lifetimeWinnings)}
                              </TableCell>
                              <TableCell className="hidden sm:table-cell text-right text-wine font-mono text-xs font-medium px-2 sm:px-4">
                                {formatChips(user.lifetimeLosses)}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs font-semibold px-2 sm:px-4">
                                <span
                                  className={`inline-flex items-center gap-1 ${
                                    user.net > 0
                                      ? 'text-felt'
                                      : user.net < 0
                                        ? 'text-wine'
                                        : 'text-espresso-muted'
                                  }`}
                                >
                                  {user.net > 0 && <TrendingUp className="h-3 w-3" />}
                                  {user.net < 0 && <TrendingDown className="h-3 w-3" />}
                                  {formatChips(user.net)}
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* TAB 2: Game History */}
        {activeTab === 'history' && (
          <Card className="border-border shadow-classic">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Session History</CardTitle>
                <CardDescription>
                  Past game tallies and automated net distributions
                </CardDescription>
              </div>
              <Badge variant="outline" className="font-serif text-xs">
                {games.length} Recorded
              </Badge>
            </CardHeader>
            <CardContent>
              {games.length === 0 ? (
                <div className="py-12 text-center text-espresso-muted font-serif text-sm">
                  No games have been settled yet. Sessions will appear here after
                  completion.
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {games.map((game) => (
                    <div key={game.id} className="py-4 first:pt-0 last:pb-0 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-serif font-semibold text-espresso">
                            Table {game.roomCode || 'Private'}
                          </span>
                          <span className="text-espresso-muted">
                            {new Date(game.date).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                        <div className="text-espresso font-serif">
                          Pot:{' '}
                          <span className="font-mono font-medium">
                            {formatChips(game.totalPot || 0)}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                        {game.players.map((p, idx) => (
                          <div
                            key={idx}
                            className="p-2 rounded bg-parchment-200/60 border border-border/60 text-xs flex justify-between items-center"
                          >
                            <span className="font-serif text-espresso truncate">
                              {p.username}
                            </span>
                            <span
                              className={`font-mono text-[11px] font-semibold ${
                                p.net > 0
                                  ? 'text-felt'
                                  : p.net < 0
                                    ? 'text-wine'
                                    : 'text-espresso-muted'
                              }`}
                            >
                              {p.net > 0 ? `+${formatChips(p.net)}` : formatChips(p.net)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      {/* Understated Classic Footer */}
      <footer className="border-t border-border/70 py-6 text-center text-xs font-serif text-espresso-muted">
        The Card Room • Private Texas Hold&apos;em Club Ledger
      </footer>
    </div>
  );
}
