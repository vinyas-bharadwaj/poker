'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Eye, EyeOff, Lock, Mail, User as UserIcon } from 'lucide-react';
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

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/profile';

  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!username || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      await register(username.trim(), email.trim(), password);
      router.push(redirectPath);
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-border shadow-classic">
      <CardHeader className="text-center pb-3">
        <CardTitle>Join The Club</CardTitle>
        <CardDescription>
          Create your player profile to start tracking stats
        </CardDescription>
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
              htmlFor="username"
              className="text-xs font-serif text-espresso flex items-center gap-1"
            >
              <UserIcon className="h-3 w-3 text-espresso-muted" />
              Player Name / Handle
            </label>
            <Input
              id="username"
              name="username"
              type="text"
              placeholder="e.g. Doc_Holliday"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-xs font-serif text-espresso flex items-center gap-1"
            >
              <Mail className="h-3 w-3 text-espresso-muted" />
              Email Address
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="player@example.com"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="new-password"
              className="text-xs font-serif text-espresso flex items-center gap-1"
            >
              <Lock className="h-3 w-3 text-espresso-muted" />
              Password
            </label>
            <div className="relative">
              <Input
                id="new-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="new-password"
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
            {submitting ? 'Creating Profile...' : 'Register'}
          </Button>
        </form>

        <div className="mt-5 text-center text-xs font-serif text-espresso-muted border-t border-border/60 pt-4">
          Already a member?{' '}
          <Link
            href={`/login${redirectPath !== '/profile' ? `?redirect=${encodeURIComponent(redirectPath)}` : ''}`}
            className="text-felt font-semibold hover:underline"
          >
            Sign in here
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function RegisterPage() {
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
              Loading registration...
            </div>
          }
        >
          <RegisterForm />
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
