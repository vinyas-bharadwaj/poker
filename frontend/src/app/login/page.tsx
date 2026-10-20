'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Eye, EyeOff, Lock, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/profile';

  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!identifier || !password) {
      setError('Please enter your username/email and password.');
      return;
    }

    setSubmitting(true);
    try {
      await login(identifier.trim(), password);
      router.push(redirectPath);
    } catch (err: any) {
      setError(err.message || 'Invalid username or password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-border shadow-classic">
      <CardHeader className="text-center pb-3">
        <CardTitle>Member Sign In</CardTitle>
        <CardDescription>Enter your credentials to access the card room</CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <div
            role="alert"
            className="mb-4 p-2.5 rounded text-xs bg-wine/10 border border-wine/25 text-wine flex items-center gap-2"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="identifier"
              className="text-xs font-serif text-espresso flex items-center gap-1"
            >
              <UserIcon className="h-3 w-3 text-espresso-muted" />
              Username or Email
            </label>
            <Input
              id="identifier"
              name="identifier"
              type="text"
              placeholder="alice or alice@example.com"
              autoComplete="username"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="current-password"
              className="text-xs font-serif text-espresso flex items-center gap-1"
            >
              <Lock className="h-3 w-3 text-espresso-muted" />
              Password
            </label>
            <div className="relative">
              <Input
                id="current-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-9"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-espresso-muted hover:text-espresso p-0.5"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="poker"
            className="w-full text-xs"
            disabled={submitting}
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-5 text-center text-xs font-serif text-espresso-muted border-t border-border/60 pt-4">
          Not a member yet?{' '}
          <Link
            href={`/register${redirectPath !== '/profile' ? `?redirect=${encodeURIComponent(redirectPath)}` : ''}`}
            className="text-felt font-semibold hover:underline"
          >
            Register here
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-parchment-100 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        {/* Masthead Header */}
        <div className="text-center space-y-1">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-felt font-serif text-2xl tracking-tight hover:opacity-90 transition-opacity"
          >
            <span>♠</span>
            <span>The Card Room</span>
          </Link>
          <p className="text-xs font-serif text-espresso-muted">
            Private Texas Hold&apos;em Club
          </p>
        </div>

        <Suspense
          fallback={
            <div className="text-center text-xs text-espresso-muted font-serif">
              Loading sign-in...
            </div>
          }
        >
          <LoginForm />
        </Suspense>

        <div className="text-center">
          <Link
            href="/"
            className="text-xs font-serif text-espresso-muted hover:text-espresso transition-colors"
          >
            ← Return to Club Ledger
          </Link>
        </div>
      </div>
    </div>
  );
}
