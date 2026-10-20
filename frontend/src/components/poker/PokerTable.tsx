'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClientGameState,
  ClientPlayerInGame,
  PlayerActionType,
  Card,
} from '@/lib/gameTypes';
import { PlayingCard } from './PlayingCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatChips } from '@/lib/utils';
import { evaluateHeroHand } from '@/lib/evaluator';
import {
  Coins,
  Trophy,
  Play,
  Volume2,
  VolumeX,
  Flag,
  AlertTriangle,
  Minus,
  Plus,
  Sparkles,
} from 'lucide-react';
import {
  playCardDeal,
  playChipClink,
  playCheck,
  playFold,
  playWin,
  playTurnNotification,
  isSoundEnabled,
  toggleSound,
} from '@/lib/sound';

interface PokerTableProps {
  gameState: ClientGameState;
  currentUserId: string;
  isGameMaster: boolean;
  onAction: (action: PlayerActionType, amount?: number) => void;
  onNextHand: () => void;
  onEndGame?: () => void;
  actionLoading?: boolean;
}

export const PokerTable: React.FC<PokerTableProps> = ({
  gameState,
  currentUserId,
  isGameMaster,
  onAction,
  onNextHand,
  onEndGame,
  actionLoading = false,
}) => {
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [showEndGameConfirm, setShowEndGameConfirm] = useState(false);

  const prevRoundRef = useRef(gameState.round);
  const prevTurnRef = useRef(gameState.currentTurnUserId);
  const prevPotRef = useRef(gameState.pot);

  useEffect(() => {
    setSoundOn(isSoundEnabled());
  }, []);

  const handleToggleSound = () => {
    const newState = toggleSound();
    setSoundOn(newState);
  };

  const myPlayer = gameState.players.find((p) => p.userId === currentUserId);
  const isMyTurn =
    myPlayer?.isTurn &&
    !myPlayer?.folded &&
    !myPlayer?.isAllIn &&
    gameState.round !== 'showdown';

  // Audio Effects Triggers on State Changes
  useEffect(() => {
    // 1. Play Card Deal sound on round progression
    if (gameState.round !== prevRoundRef.current) {
      if (
        gameState.round === 'preflop' ||
        gameState.round === 'flop' ||
        gameState.round === 'turn' ||
        gameState.round === 'river'
      ) {
        playCardDeal();
      } else if (gameState.round === 'showdown') {
        playWin();
      }
      prevRoundRef.current = gameState.round;
    }

    // 2. Play Turn Reminder when turn moves to Hero
    if (
      gameState.currentTurnUserId === currentUserId &&
      prevTurnRef.current !== currentUserId &&
      isMyTurn
    ) {
      playTurnNotification();
    }
    prevTurnRef.current = gameState.currentTurnUserId;

    // 3. Play Chip sound when pot increases
    if (gameState.pot > prevPotRef.current && prevPotRef.current > 0) {
      playChipClink();
    }
    prevPotRef.current = gameState.pot;
  }, [gameState.round, gameState.currentTurnUserId, gameState.pot, currentUserId, isMyTurn]);

  // Calculate call and raise bounds
  const currentBet = myPlayer?.currentBet ?? 0;
  const myChips = myPlayer?.chips ?? 0;
  const toCall = Math.max(0, gameState.currentHighestBet - currentBet);
  const canCheck = toCall === 0;
  const isCallAllIn = toCall >= myChips;

  const minRaiseTarget = gameState.currentHighestBet + (gameState.minRaiseAmount || 1);
  const maxRaiseTarget = currentBet + myChips;
  const canRaise = myChips > toCall && maxRaiseTarget >= minRaiseTarget;
  const raiseStep = 1;
  const stepperDelta = 10;

  const [raiseAmount, setRaiseAmount] = useState<number>(minRaiseTarget);

  // Sync raise slider when turn changes or highest bet changes
  useEffect(() => {
    if (canRaise) {
      setRaiseAmount(minRaiseTarget);
    }
  }, [gameState.currentHighestBet, canRaise, minRaiseTarget]);

  // Quick preset targets
  const halfPotTarget = Math.min(
    maxRaiseTarget,
    Math.max(minRaiseTarget, Math.round(gameState.pot / 2) + gameState.currentHighestBet)
  );
  const potTarget = Math.min(
    maxRaiseTarget,
    Math.max(minRaiseTarget, gameState.pot + gameState.currentHighestBet)
  );

  // Order other players starting after the current player to form an intuitive circle
  const orderedPlayers = React.useMemo(() => {
    if (!myPlayer) return gameState.players;
    const myIndex = gameState.players.findIndex((p) => p.userId === currentUserId);
    if (myIndex === -1) return gameState.players;

    const list: ClientPlayerInGame[] = [];
    for (let i = 0; i < gameState.players.length; i++) {
      const idx = (myIndex + i) % gameState.players.length;
      list.push(gameState.players[idx]);
    }
    return list;
  }, [gameState.players, currentUserId, myPlayer]);

  const heroPlayer = orderedPlayers[0];
  const opponentPlayers = orderedPlayers.slice(1);

  // Action handlers
  const handleFold = React.useCallback(() => {
    playFold();
    onAction('fold');
  }, [onAction]);

  const handleCheck = React.useCallback(() => {
    playCheck();
    onAction('check');
  }, [onAction]);

  const handleCall = React.useCallback(() => {
    playChipClink();
    onAction('call');
  }, [onAction]);

  const handleRaise = React.useCallback((amount: number) => {
    playChipClink();
    onAction('raise', amount);
  }, [onAction]);

  const handleAllIn = React.useCallback(() => {
    playChipClink();
    onAction('all-in');
  }, [onAction]);

  // Keyboard Shortcuts when it's Hero's turn
  useEffect(() => {
    if (!isMyTurn) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing inside an input element
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        handleFold();
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        if (canCheck) {
          handleCheck();
        } else {
          handleCall();
        }
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        if (canRaise) {
          if (raiseAmount >= maxRaiseTarget) {
            handleAllIn();
          } else {
            handleRaise(raiseAmount);
          }
        }
      } else if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        if (canRaise) {
          handleAllIn();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isMyTurn,
    canCheck,
    canRaise,
    raiseAmount,
    maxRaiseTarget,
    handleFold,
    handleCheck,
    handleCall,
    handleRaise,
    handleAllIn,
  ]);

  return (
    <div className="flex flex-col items-center w-full max-w-5xl mx-auto space-y-4">
      {/* Hand Status Bar */}
      <div className="w-full flex items-center justify-between text-xs font-serif text-espresso px-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-[11px] uppercase tracking-wider">
            Hand #{gameState.handNumber}
          </Badge>
          <span className="text-espresso-muted">•</span>
          <Badge variant="success" className="text-[11px] uppercase font-mono tracking-wider">
            {gameState.round}
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          {/* Sound Mute/Unmute */}
          <button
            type="button"
            onClick={handleToggleSound}
            aria-label={soundOn ? 'Mute sound' : 'Unmute sound'}
            className="p-1 rounded text-espresso-muted hover:text-espresso hover:bg-parchment-200 transition-colors cursor-pointer"
            title={soundOn ? 'Mute sound' : 'Unmute sound'}
          >
            {soundOn ? <Volume2 className="h-4 w-4 text-felt" /> : <VolumeX className="h-4 w-4 text-wine" />}
          </button>

          <span className="text-border">|</span>

          <div className="flex items-center gap-1.5">
            <span className="text-espresso-muted">Total Pot:</span>
            <motion.span
              key={gameState.pot}
              initial={{ scale: 1.15 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2 }}
              className="font-mono font-bold text-sm text-felt flex items-center gap-1"
            >
              <Coins className="h-3.5 w-3.5 text-brass" />
              {formatChips(gameState.pot)}
            </motion.span>
          </div>

          {isGameMaster && onEndGame && (
            <>
              <span className="text-border">|</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEndGameConfirm(true)}
                className="text-[11px] text-wine hover:text-wine-dark hover:bg-wine/10 border-wine/30 h-7 px-2.5 gap-1 font-serif cursor-pointer"
              >
                <Flag className="h-3 w-3" />
                <span>End Game</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Ending Game */}
      {showEndGameConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso/50 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-parchment-50 border border-wine/40 rounded-xl p-6 max-w-sm w-full space-y-4 text-center shadow-paper"
          >
            <AlertTriangle className="h-8 w-8 text-wine mx-auto" />
            <div className="space-y-1">
              <h3 className="font-serif text-lg font-normal text-espresso">End Poker Session?</h3>
              <p className="text-xs text-espresso-muted font-serif">
                This will finalize chip counts, calculate all debt settlements, and record lifetime statistics for all players.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEndGameConfirm(false)}
                className="text-xs font-serif cursor-pointer"
              >
                Continue Playing
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setShowEndGameConfirm(false);
                  onEndGame?.();
                }}
                className="text-xs font-serif bg-wine hover:bg-wine-dark text-parchment-50 cursor-pointer"
              >
                Conclude &amp; Settle
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* The Felt Table Container */}
      <div className="relative w-full aspect-[16/9] min-h-[420px] max-h-[520px] rounded-[100px] border-[10px] border-[#3e2723] bg-[#1a382b] shadow-2xl p-4 sm:p-6 overflow-hidden select-none">
        {/* Subtle Felt Texture & Inner Inlay Line */}
        <div className="absolute inset-3 rounded-[85px] border border-brass/25 pointer-events-none" />
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:12px_12px] pointer-events-none" />

        {/* Dynamic Opponent Seats positioned around the table perimeter */}
        {opponentPlayers.map((player, idx) => (
          <div
            key={player.userId}
            className="absolute z-20"
            style={getOpponentPosition(idx, opponentPlayers.length)}
          >
            <OpponentSeat player={player} />
          </div>
        ))}

        {opponentPlayers.length === 0 && (
          <div className="absolute left-1/2 top-10 -translate-x-1/2 text-xs text-parchment-200/50 font-serif italic py-2">
            Waiting for opponents to connect...
          </div>
        )}

        {/* Table Center: Pot and Community Cards */}
        <div className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center justify-center space-y-3 w-full max-w-md px-2 pointer-events-none">
          {/* Main Pot Display */}
          <motion.div
            key={gameState.pot}
            initial={{ scale: 0.92 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="bg-[#12261d]/95 border border-brass/40 px-4 py-1.5 rounded-full shadow-classic flex items-center gap-2"
          >
            <span className="text-[10px] font-mono tracking-wider text-parchment-200 uppercase">
              Pot
            </span>
            <span className="font-mono font-bold text-base text-brass">
              {formatChips(gameState.pot)}
            </span>
          </motion.div>

          {/* 5 Community Card Slots with Staggered Reveal */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2.5">
            {Array.from({ length: 5 }).map((_, idx) => {
              const card = gameState.communityCards[idx];
              return (
                <div key={idx} className="relative">
                  {card ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, y: -8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ duration: 0.22, delay: idx * 0.05 }}
                    >
                      <PlayingCard card={card} size="md" className="shadow-lg" />
                    </motion.div>
                  ) : (
                    <div className="w-14 h-20 rounded-md border border-dashed border-parchment-100/20 bg-[#12261d]/40 flex items-center justify-center">
                      <span className="text-parchment-200/20 text-xs font-mono">
                        {idx < 3 ? 'FLOP' : idx === 3 ? 'TURN' : 'RIVER'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Showdown Winner Banner */}
          <AnimatePresence>
            {gameState.round === 'showdown' && gameState.showdown && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.25 }}
                className="bg-parchment-50/95 border border-brass text-espresso px-4 py-2 rounded-lg shadow-classic text-center max-w-md space-y-1"
              >
                <div className="flex items-center justify-center gap-1.5 text-xs font-serif font-bold text-wine">
                  <Trophy className="h-3.5 w-3.5 text-brass" />
                  <span>Hand Result</span>
                </div>
                {gameState.showdown.winners.map((w) => (
                  <div key={w.userId} className="text-xs font-serif">
                    <span className="font-semibold text-felt">{w.username}</span> won{' '}
                    <strong className="text-espresso font-mono">{formatChips(w.amountWon)}</strong>{' '}
                    <span className="text-espresso-muted">({w.handDescription})</span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Hero (Current User) Seated at Bottom Center */}
        {heroPlayer && (
          <div className="absolute left-1/2 bottom-3 -translate-x-1/2 z-20 flex flex-col items-center">
            <HeroSeat
              player={heroPlayer}
              communityCards={gameState.communityCards}
            />
          </div>
        )}
      </div>

      {/* Action Controls Panel */}
      <div className="w-full bg-parchment-50 border border-border rounded-xl p-4 shadow-classic space-y-3">
        {gameState.round === 'showdown' ? (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="space-y-0.5">
              <h4 className="font-serif text-sm font-semibold text-espresso">Hand Concluded</h4>
              <p className="text-xs text-espresso-muted font-serif">
                Review showdown hands above before starting the next hand.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              {isGameMaster && onEndGame && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEndGameConfirm(true)}
                  disabled={actionLoading}
                  className="text-xs font-serif text-wine border-wine/40 hover:bg-wine/10 cursor-pointer"
                >
                  <Flag className="h-3 w-3 mr-1" />
                  <span>End Session</span>
                </Button>
              )}

              {isGameMaster ? (
                <Button
                  variant="brass"
                  size="sm"
                  onClick={onNextHand}
                  disabled={actionLoading}
                  className="gap-2 font-serif text-xs px-5 cursor-pointer"
                >
                  <Play className="h-3.5 w-3.5 fill-espresso" />
                  <span>Deal Next Hand</span>
                </Button>
              ) : (
                <div className="text-xs font-serif text-espresso-muted italic">
                  Waiting for the Game Master to deal the next hand...
                </div>
              )}
            </div>
          </div>
        ) : isMyTurn ? (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            {/* Raise Controls Section (if raise is eligible) */}
            {canRaise && (
              <div className="space-y-2.5 pt-1 border-b border-border/40 pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-serif text-espresso-muted">Raise Amount:</span>
                    <div className="flex items-center gap-1 bg-parchment-100 border border-border rounded-md px-2.5 py-1 shadow-inner">
                      <span className="font-mono text-xs text-espresso-muted font-bold">₹</span>
                      <input
                        type="number"
                        min={minRaiseTarget}
                        max={maxRaiseTarget}
                        step={raiseStep}
                        value={raiseAmount}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (!isNaN(val)) {
                            setRaiseAmount(Math.min(maxRaiseTarget, Math.max(minRaiseTarget, val)));
                          }
                        }}
                        className="w-20 font-mono font-bold text-xs bg-transparent text-espresso outline-none"
                      />
                    </div>
                  </div>

                  {/* Steppers & Presets */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Stepper Buttons */}
                    <button
                      type="button"
                      onClick={() => setRaiseAmount((prev) => Math.max(minRaiseTarget, prev - stepperDelta))}
                      disabled={raiseAmount <= minRaiseTarget}
                      aria-label="Decrease raise"
                      className="p-1 bg-parchment-100 hover:bg-parchment-200 disabled:opacity-40 text-espresso rounded border border-border transition-colors cursor-pointer"
                      title={`-${formatChips(stepperDelta)}`}
                    >
                      <Minus className="h-3 w-3" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setRaiseAmount((prev) => Math.min(maxRaiseTarget, prev + stepperDelta))}
                      disabled={raiseAmount >= maxRaiseTarget}
                      aria-label="Increase raise"
                      className="p-1 bg-parchment-100 hover:bg-parchment-200 disabled:opacity-40 text-espresso rounded border border-border transition-colors cursor-pointer"
                      title={`+${formatChips(stepperDelta)}`}
                    >
                      <Plus className="h-3 w-3" />
                    </button>

                    {/* Presets */}
                    <button
                      type="button"
                      onClick={() => setRaiseAmount(minRaiseTarget)}
                      className={`text-[11px] font-mono px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                        raiseAmount === minRaiseTarget
                          ? 'bg-felt text-parchment-50 border-felt font-bold'
                          : 'bg-parchment-100 hover:bg-parchment-200 text-espresso border-border'
                      }`}
                    >
                      Min ({formatChips(minRaiseTarget)})
                    </button>

                    {halfPotTarget > minRaiseTarget && halfPotTarget < maxRaiseTarget && (
                      <button
                        type="button"
                        onClick={() => setRaiseAmount(halfPotTarget)}
                        className={`text-[11px] font-mono px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                          raiseAmount === halfPotTarget
                            ? 'bg-felt text-parchment-50 border-felt font-bold'
                            : 'bg-parchment-100 hover:bg-parchment-200 text-espresso border-border'
                        }`}
                      >
                        1/2 Pot
                      </button>
                    )}

                    {potTarget > minRaiseTarget && potTarget < maxRaiseTarget && (
                      <button
                        type="button"
                        onClick={() => setRaiseAmount(potTarget)}
                        className={`text-[11px] font-mono px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                          raiseAmount === potTarget
                            ? 'bg-felt text-parchment-50 border-felt font-bold'
                            : 'bg-parchment-100 hover:bg-parchment-200 text-espresso border-border'
                        }`}
                      >
                        Pot
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setRaiseAmount(maxRaiseTarget)}
                      className={`text-[11px] font-mono px-2 py-0.5 rounded border transition-colors cursor-pointer font-bold ${
                        raiseAmount === maxRaiseTarget
                          ? 'bg-wine text-parchment-50 border-wine'
                          : 'bg-parchment-100 hover:bg-wine/10 text-wine border-border'
                      }`}
                    >
                      All-In ({formatChips(maxRaiseTarget)})
                    </button>
                  </div>
                </div>

                {/* Range Slider */}
                <div className="w-full flex items-center gap-3 pt-0.5">
                  <input
                    type="range"
                    min={minRaiseTarget}
                    max={maxRaiseTarget}
                    step={raiseStep}
                    value={raiseAmount}
                    onChange={(e) => setRaiseAmount(Number(e.target.value))}
                    className="w-full accent-felt cursor-pointer h-2 bg-parchment-200 rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* Core Action Buttons: Fold, Check/Call, Raise */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="text-[11px] font-serif text-espresso-muted hidden sm:flex items-center gap-2">
                <span>Shortcuts:</span>
                <kbd className="px-1.5 py-0.5 bg-parchment-200 border border-border rounded font-mono text-[10px]">F</kbd>
                <span>Fold</span>
                <kbd className="px-1.5 py-0.5 bg-parchment-200 border border-border rounded font-mono text-[10px]">C</kbd>
                <span>Check/Call</span>
                {canRaise && (
                  <>
                    <kbd className="px-1.5 py-0.5 bg-parchment-200 border border-border rounded font-mono text-[10px]">R</kbd>
                    <span>Raise</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2.5 ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFold}
                  disabled={actionLoading}
                  className="text-wine border-wine/40 hover:bg-wine/10 text-xs font-serif px-4 cursor-pointer"
                >
                  Fold (F)
                </Button>

                {canCheck ? (
                  <Button
                    variant="poker"
                    size="sm"
                    onClick={handleCheck}
                    disabled={actionLoading}
                    className="text-xs font-serif px-5 cursor-pointer"
                  >
                    Check (C)
                  </Button>
                ) : (
                  <Button
                    variant="poker"
                    size="sm"
                    onClick={handleCall}
                    disabled={actionLoading}
                    className="text-xs font-serif px-5 cursor-pointer font-semibold"
                  >
                    {isCallAllIn
                      ? `All-In Call (${formatChips(myChips)}) (C)`
                      : `Call ${formatChips(toCall)} (C)`}
                  </Button>
                )}

                {canRaise && (
                  <Button
                    variant="brass"
                    size="sm"
                    onClick={() => {
                      if (raiseAmount >= maxRaiseTarget) {
                        handleAllIn();
                      } else {
                        handleRaise(raiseAmount);
                      }
                    }}
                    disabled={actionLoading}
                    className="text-xs font-serif px-5 cursor-pointer font-semibold"
                  >
                    {raiseAmount >= maxRaiseTarget
                      ? `Shove All-In (${formatChips(maxRaiseTarget)}) (R)`
                      : `Raise to ${formatChips(raiseAmount)} (R)`}
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="flex items-center justify-between text-xs font-serif text-espresso-muted">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-felt animate-pulse" />
              <span>
                {heroPlayer?.folded
                  ? 'You folded this hand. Waiting for the hand to complete...'
                  : heroPlayer?.isAllIn
                  ? 'You are All-In! Watching remaining action...'
                  : `Waiting for ${
                      gameState.players.find((p) => p.userId === gameState.currentTurnUserId)
                        ?.username || 'player'
                    } to act...`}
              </span>
            </div>

            <div className="font-mono text-espresso">
              Your Chips: <strong>{formatChips(myChips)}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Dynamic Opponent Seat Position Helper
function getOpponentPosition(index: number, total: number): React.CSSProperties {
  const PRESETS: Record<number, { left: string; top: string }[]> = {
    1: [{ left: '50%', top: '16%' }],
    2: [
      { left: '26%', top: '16%' },
      { left: '74%', top: '16%' },
    ],
    3: [
      { left: '14%', top: '34%' },
      { left: '50%', top: '15%' },
      { left: '86%', top: '34%' },
    ],
    4: [
      { left: '12%', top: '40%' },
      { left: '30%', top: '16%' },
      { left: '70%', top: '16%' },
      { left: '88%', top: '40%' },
    ],
    5: [
      { left: '11%', top: '45%' },
      { left: '24%', top: '20%' },
      { left: '50%', top: '14%' },
      { left: '76%', top: '20%' },
      { left: '89%', top: '45%' },
    ],
    6: [
      { left: '10%', top: '48%' },
      { left: '18%', top: '24%' },
      { left: '38%', top: '14%' },
      { left: '62%', top: '14%' },
      { left: '82%', top: '24%' },
      { left: '90%', top: '48%' },
    ],
    7: [
      { left: '10%', top: '50%' },
      { left: '16%', top: '30%' },
      { left: '30%', top: '16%' },
      { left: '50%', top: '13%' },
      { left: '70%', top: '16%' },
      { left: '84%', top: '30%' },
      { left: '90%', top: '50%' },
    ],
  };

  const preset = PRESETS[total];
  if (preset && preset[index]) {
    return {
      left: preset[index].left,
      top: preset[index].top,
      transform: 'translate(-50%, -50%)',
    };
  }

  // Fallback parametric placement
  const t = total > 1 ? index / (total - 1) : 0.5;
  const angle = Math.PI - 0.35 - t * (Math.PI - 0.7);
  const cx = 50;
  const cy = 48;
  const rx = 40;
  const ry = 33;
  const x = cx + rx * Math.cos(angle);
  const y = cy - ry * Math.sin(angle);
  return {
    left: `${x.toFixed(1)}%`,
    top: `${y.toFixed(1)}%`,
    transform: 'translate(-50%, -50%)',
  };
}

// Opponent Seat Component with smooth animated turn ring and bet chips
const OpponentSeat: React.FC<{ player: ClientPlayerInGame }> = ({ player }) => {
  return (
    <motion.div
      animate={{
        scale: player.isTurn ? 1.05 : 1,
      }}
      transition={{ duration: 0.2 }}
      className={`flex flex-col items-center p-2 rounded-lg transition-all duration-200 relative min-w-[85px] sm:min-w-[96px] ${
        player.isTurn
          ? 'bg-parchment-50 ring-2 ring-brass shadow-xl'
          : player.folded
          ? 'opacity-40 grayscale bg-[#12261d]/60'
          : 'bg-[#12261d]/85 border border-border/40 text-parchment-100 shadow-md'
      }`}
    >
      {/* Turn Breathing Glow Halo */}
      {player.isTurn && (
        <motion.div
          className="absolute -inset-1 rounded-xl bg-brass/30 pointer-events-none -z-10 blur-xs"
          animate={{ opacity: [0.35, 0.85, 0.35] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Cards Display */}
      <div className="flex items-center gap-1 mb-1.5">
        {player.cards.length > 0 ? (
          player.cards.map((card, i) => (
            <PlayingCard
              key={i}
              card={card}
              faceDown={!card}
              folded={player.folded}
              size="sm"
            />
          ))
        ) : (
          <div className="h-14 flex items-center justify-center text-[10px] text-parchment-200/40 font-mono">
            Empty
          </div>
        )}
      </div>

      {/* Name, Chips, Badges */}
      <div className="text-center space-y-0.5 w-full">
        <div className="flex items-center justify-center gap-1">
          {player.isDealer && (
            <span className="bg-brass text-espresso font-mono font-bold text-[9px] h-3.5 w-3.5 rounded-full flex items-center justify-center shrink-0">
              D
            </span>
          )}
          <span
            className={`font-serif text-xs font-semibold truncate max-w-[80px] sm:max-w-[90px] ${
              player.isTurn ? 'text-espresso' : 'text-parchment-50'
            }`}
          >
            {player.username}
          </span>
        </div>

        <div
          className={`font-mono text-[11px] ${
            player.isTurn ? 'text-espresso-muted' : 'text-brass/90'
          }`}
        >
          {formatChips(player.chips)}
        </div>

        {player.isTurn && !player.folded && (
          <div className="text-[9px] font-mono text-wine font-semibold flex items-center justify-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-wine animate-ping" />
            <span>Thinking...</span>
          </div>
        )}

        {player.currentBet > 0 && (
          <motion.div
            initial={{ scale: 0.7, opacity: 0, y: 3 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="inline-flex items-center gap-1 bg-felt/90 text-parchment-50 font-mono text-[10px] px-1.5 py-0.2 rounded-full mt-0.5 border border-brass/30"
          >
            <Coins className="h-2.5 w-2.5 text-brass" />
            <span>{formatChips(player.currentBet)}</span>
          </motion.div>
        )}

        {player.folded && (
          <div className="text-[10px] font-serif text-wine font-semibold">Folded</div>
        )}
        {player.isAllIn && (
          <div className="text-[10px] font-serif text-brass font-bold">ALL-IN</div>
        )}
      </div>
    </motion.div>
  );
};

// Hero (Current User) Seat Component with Evaluated Hand Strength Indicator
const HeroSeat: React.FC<{
  player: ClientPlayerInGame;
  communityCards: Card[];
}> = ({ player, communityCards }) => {
  const heroHand = evaluateHeroHand(player.cards, communityCards);

  return (
    <div className="flex flex-col items-center space-y-1.5">
      {/* Evaluated Hand Strength Pill */}
      {heroHand && !player.folded && (
        <motion.div
          initial={{ opacity: 0, y: 2, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-serif border shadow-sm ${
            heroHand.rankLevel >= 7
              ? 'bg-brass text-espresso border-brass font-bold shadow-md'
              : heroHand.rankLevel >= 4
              ? 'bg-felt text-parchment-50 border-felt-light font-semibold shadow-sm'
              : heroHand.rankLevel >= 2
              ? 'bg-parchment-50 text-felt border-felt/40 font-semibold'
              : 'bg-parchment-100/90 text-espresso-muted border-border/80'
          }`}
        >
          <Sparkles className="h-3 w-3 text-brass shrink-0" />
          <span className="font-mono text-[9px] uppercase tracking-wider opacity-75">
            {heroHand.subtitle}:
          </span>
          <span className="font-semibold">{heroHand.title}</span>
        </motion.div>
      )}

      {/* Hero Seat Box */}
      <motion.div
        animate={{
          scale: player.isTurn ? 1.03 : 1,
        }}
        transition={{ duration: 0.2 }}
        className={`flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 relative ${
          player.isTurn
            ? 'bg-parchment-50 ring-2 ring-brass shadow-2xl'
            : 'bg-[#12261d]/95 border border-border/50 text-parchment-50 shadow-md'
        }`}
      >
        {/* Turn Breathing Halo */}
        {player.isTurn && (
          <motion.div
            className="absolute -inset-1 rounded-2xl bg-brass/35 pointer-events-none -z-10 blur-xs"
            animate={{ opacity: [0.35, 0.9, 0.35] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* 2 Hole Cards */}
        <div className="flex items-center gap-1.5">
          {player.cards.map((card, i) => (
            <PlayingCard
              key={i}
              card={card}
              faceDown={!card}
              folded={player.folded}
              size="md"
              className="shadow-md"
            />
          ))}
        </div>

        {/* Info Block */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            {player.isDealer && (
              <span className="bg-brass text-espresso font-mono font-bold text-[10px] h-4 w-4 rounded-full flex items-center justify-center shrink-0">
                D
              </span>
            )}
            <span
              className={`font-serif text-sm font-semibold ${
                player.isTurn ? 'text-espresso' : 'text-parchment-50'
              }`}
            >
              {player.username} <span className="text-[11px] font-normal opacity-75">(You)</span>
            </span>
          </div>

          <div
            className={`font-mono text-xs font-bold ${
              player.isTurn ? 'text-felt' : 'text-brass'
            }`}
          >
            {formatChips(player.chips)}
          </div>

          {player.isTurn && !player.folded && (
            <div className="text-[9px] font-mono font-bold text-wine bg-wine/10 border border-wine/20 px-1.5 py-0.2 rounded-full animate-pulse inline-block">
              YOUR TURN
            </div>
          )}

          {player.currentBet > 0 && (
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="inline-flex items-center gap-1 bg-felt text-parchment-50 font-mono text-[10px] px-2 py-0.5 rounded-full"
            >
              <Coins className="h-2.5 w-2.5 text-brass" />
              <span>In Hand: {formatChips(player.currentBet)}</span>
            </motion.div>
          )}

          {player.folded && (
            <span className="text-xs font-serif text-wine font-semibold block">Folded</span>
          )}
          {player.isAllIn && (
            <span className="text-xs font-serif text-brass font-bold block">ALL-IN</span>
          )}
        </div>
      </motion.div>
    </div>
  );
};
