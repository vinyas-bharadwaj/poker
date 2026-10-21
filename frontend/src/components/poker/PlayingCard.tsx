'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card as CardType, Suit } from '@/lib/gameTypes';

interface PlayingCardProps {
  card?: CardType | null;
  faceDown?: boolean;
  folded?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

export const PlayingCard: React.FC<PlayingCardProps> = ({
  card,
  faceDown = false,
  folded = false,
  size = 'md',
  className = '',
}) => {
  const isRed = card?.suit === 'hearts' || card?.suit === 'diamonds';

  const sizeClasses = {
    sm: 'w-6 h-9 sm:w-10 sm:h-14 text-[8px] sm:text-xs rounded-xs sm:rounded',
    md: 'w-9 h-13 sm:w-14 sm:h-20 text-[10px] sm:text-sm rounded sm:rounded-md',
    lg: 'w-16 h-22 sm:w-18 sm:h-26 text-sm sm:text-base rounded-lg',
  }[size];

  // Face Down Card
  if (faceDown || !card) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={`relative select-none border border-border shadow-xs sm:shadow-sm flex items-center justify-center overflow-hidden transition-all duration-200 ${sizeClasses} ${
          folded ? 'opacity-40 grayscale' : ''
        } ${className}`}
        style={{
          background: 'linear-gradient(135deg, #1f3a2b 0%, #162a1f 100%)',
        }}
      >
        <div className="absolute inset-0.5 sm:inset-1 rounded-xs border border-brass/30 flex items-center justify-center">
          <div className="w-full h-full opacity-25 bg-[radial-gradient(#c6a25a_1px,transparent_1px)] [background-size:4px_4px] sm:[background-size:6px_6px]" />
          <span className="absolute text-brass/70 font-serif text-[7px] sm:text-[10px]">♠</span>
        </div>
      </motion.div>
    );
  }

  const symbol = SUIT_SYMBOLS[card.suit];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.88, y: -6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className={`relative select-none bg-parchment-50 border border-border/80 shadow-classic flex flex-col justify-between p-0.5 sm:p-1 transition-all duration-200 ${sizeClasses} ${
        isRed ? 'text-wine' : 'text-espresso'
      } ${folded ? 'opacity-40 grayscale' : ''} ${className}`}
    >
      {/* Top Left Corner */}
      <div className="flex flex-col items-center leading-none">
        <span className="font-mono font-bold text-[8px] sm:text-xs tracking-tighter">{card.rank}</span>
        <span className="text-[7px] sm:text-[10px] leading-tight">{symbol}</span>
      </div>

      {/* Center Suit Emblem */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-85">
        <span
          className={
            size === 'sm'
              ? 'text-xs sm:text-base'
              : size === 'md'
              ? 'text-sm sm:text-2xl'
              : 'text-2xl sm:text-3xl'
          }
        >
          {symbol}
        </span>
      </div>

      {/* Bottom Right Corner (inverted) */}
      <div className="flex flex-col items-center leading-none rotate-180 self-end">
        <span className="font-mono font-bold text-[8px] sm:text-xs tracking-tighter">{card.rank}</span>
        <span className="text-[7px] sm:text-[10px] leading-tight">{symbol}</span>
      </div>
    </motion.div>
  );
};
