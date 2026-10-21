import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "The Cardroom — Private Texas Hold'em",
  description:
    'An intimate, classic Texas Hold’em club with lifetime stat tracking and post-game settlement.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-parchment-100 text-espresso antialiased selection:bg-felt/20 selection:text-felt-dark">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
