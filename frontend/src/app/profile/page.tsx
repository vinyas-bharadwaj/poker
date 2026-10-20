'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  LogOut,
  Calendar,
  Mail,
  User as UserIcon,
  RotateCw,
  Coins,
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
import { useAuth } from '@/context/AuthContext';
import { formatChips } from '@/lib/utils';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, logout, refreshUser } = useAuth();

  // Route protection: If not loading and not authenticated, redirect to login
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/profile');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-parchment-100 flex items-center justify-center">
        <div className="text-center font-serif text-espresso-muted space-y-2">
          <RotateCw className="h-5 w-5 animate-spin mx-auto text-felt" />
          <p className="text-xs">Loading member profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  const netBalance = user.lifetimeWinnings - user.lifetimeLosses;

  return (
    <div className="min-h-screen bg-parchment-100 text-espresso flex flex-col font-sans">
      {/* Masthead Header */}
      <header className="border-b border-border/80 bg-parchment-50/90 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="font-serif text-2xl tracking-tight text-espresso font-normal flex items-center gap-2 hover:opacity-90"
            >
              <span className="text-felt text-xl">♠</span>
              The Card Room
            </Link>
          </div>

          <div className="flex items-center space-x-3">
            <Link href="/">
              <Button variant="outline" size="sm" className="text-xs">
                ← Back to Club Ledger
              </Button>
            </Link>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                logout();
                router.push('/login');
              }}
              className="text-xs gap-1.5 text-wine hover:text-wine-dark"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Profile Body */}
      <main className="max-w-4xl mx-auto px-6 py-8 flex-1 w-full space-y-6">
        {/* Profile Banner */}
        <div className="rounded-lg border border-border bg-parchment-50 p-6 shadow-classic">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm bg-felt/10 text-felt text-xs font-serif border border-felt/20">
                <span>♠ Member in Good Standing</span>
              </div>
              <h1 className="font-serif text-3xl font-normal text-espresso">
                {user.username}
              </h1>
              <p className="text-xs text-espresso-muted font-serif flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                <span>{user.email}</span>
                <span>•</span>
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  Joined{' '}
                  {new Date(user.createdAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={refreshUser}
              className="text-xs self-start sm:self-auto gap-1"
            >
              <RotateCw className="h-3 w-3" />
              Refresh Stats
            </Button>
          </div>
        </div>

        {/* Lifetime Stats Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Lifetime Winnings */}
          <Card className="border-border shadow-classic">
            <CardHeader className="pb-1">
              <CardDescription className="text-xs uppercase tracking-wider font-serif">
                Lifetime Winnings
              </CardDescription>
              <CardTitle className="text-2xl font-mono font-medium text-felt">
                {formatChips(user.lifetimeWinnings)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[11px] text-espresso-muted">
                Gross chips collected from winning pots
              </p>
            </CardContent>
          </Card>

          {/* Lifetime Losses */}
          <Card className="border-border shadow-classic">
            <CardHeader className="pb-1">
              <CardDescription className="text-xs uppercase tracking-wider font-serif">
                Lifetime Losses
              </CardDescription>
              <CardTitle className="text-2xl font-mono font-medium text-wine">
                {formatChips(user.lifetimeLosses)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[11px] text-espresso-muted">
                Gross chips surrendered at the tables
              </p>
            </CardContent>
          </Card>

          {/* Net Ledger Balance */}
          <Card className="border-border shadow-classic">
            <CardHeader className="pb-1">
              <CardDescription className="text-xs uppercase tracking-wider font-serif">
                Net Ledger Balance
              </CardDescription>
              <CardTitle
                className={`text-2xl font-mono font-medium flex items-center gap-1.5 ${
                  netBalance > 0
                    ? 'text-felt'
                    : netBalance < 0
                      ? 'text-wine'
                      : 'text-espresso'
                }`}
              >
                {netBalance > 0 && <TrendingUp className="h-5 w-5" />}
                {netBalance < 0 && <TrendingDown className="h-5 w-5" />}
                {formatChips(netBalance)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[11px] text-espresso-muted">
                {netBalance > 0
                  ? 'Net club creditor (in profit)'
                  : netBalance < 0
                    ? 'Net club debtor (in deficit)'
                    : 'Even balance'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Account Details & Quick Navigation */}
        <Card className="border-border shadow-classic">
          <CardHeader>
            <CardTitle className="text-lg">Club Standing &amp; Identity</CardTitle>
            <CardDescription>
              Account identification for private table invitations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-border/60">
              <span className="text-espresso-muted font-serif">Member Handle:</span>
              <span className="font-serif font-semibold text-espresso">
                {user.username}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/60">
              <span className="text-espresso-muted font-serif">Registered Email:</span>
              <span className="font-mono text-espresso">{user.email}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/60">
              <span className="text-espresso-muted font-serif">Account ID:</span>
              <span className="font-mono text-[11px] text-espresso-muted">{user.id}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-espresso-muted font-serif">Status:</span>
              <Badge variant="success" className="font-serif">
                Active Member
              </Badge>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/70 py-6 text-center text-xs font-serif text-espresso-muted">
        The Card Room • Private Texas Hold&apos;em Club Ledger
      </footer>
    </div>
  );
}
