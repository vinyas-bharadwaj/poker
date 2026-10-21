'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, ArrowRight, Coins, LogOut, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EndGameResult } from '@/lib/gameTypes';
import { formatChips } from '@/lib/utils';

interface SettlementModalProps {
  settlement: EndGameResult;
  onClose: () => void;
}

export const SettlementModal: React.FC<SettlementModalProps> = ({ settlement, onClose }) => {
  const [sortMode, setSortMode] = React.useState<'winners' | 'losers'>('winners');

  const sortedScoreboard = React.useMemo(() => {
    const copy = [...settlement.scoreboard];
    if (sortMode === 'losers') {
      return copy.sort((a, b) => a.net - b.net);
    }
    return copy.sort((a, b) => b.net - a.net);
  }, [settlement.scoreboard, sortMode]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso/50 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="bg-parchment-50 border border-border shadow-paper rounded-xl max-w-xl w-full p-4 sm:p-6 space-y-4 sm:space-y-6 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="text-center space-y-1.5 border-b border-border/60 pb-3 sm:pb-4">
          <div className="inline-flex items-center justify-center p-2 rounded-full bg-brass/15 text-brass-dark mb-1">
            <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-brass" />
          </div>
          <h2 className="font-serif text-xl sm:text-2xl font-normal text-espresso">Session Concluded</h2>
          <p className="text-xs font-serif text-espresso-muted">
            Table <span className="font-mono font-semibold">{settlement.roomCode}</span> •{' '}
            {settlement.totalHands} {settlement.totalHands === 1 ? 'hand' : 'hands'} played
          </p>
        </div>

        {/* Scoreboard Table */}
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="font-serif text-xs font-semibold uppercase tracking-wider text-espresso-muted flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5 text-brass" />
              <span>Final Scoreboard</span>
            </h3>

            {/* Sort Toggle: Winners vs Losers */}
            <div className="flex items-center gap-1 bg-parchment-200/80 p-0.5 rounded border border-border text-[11px] font-serif self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setSortMode('winners')}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  sortMode === 'winners'
                    ? 'bg-parchment-50 text-felt font-semibold shadow-xs'
                    : 'text-espresso-muted hover:text-espresso'
                }`}
              >
                🏆 Winners First
              </button>
              <button
                type="button"
                onClick={() => setSortMode('losers')}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  sortMode === 'losers'
                    ? 'bg-parchment-50 text-wine font-semibold shadow-xs'
                    : 'text-espresso-muted hover:text-espresso'
                }`}
              >
                📉 Biggest Losers
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-border overflow-hidden bg-parchment-100/50">
            <table className="w-full text-left text-xs font-serif">
              <thead className="bg-parchment-200/60 text-espresso-muted border-b border-border font-mono text-[10px] uppercase">
                <tr>
                  <th className="py-2 px-2 sm:px-3">Player</th>
                  <th className="hidden sm:table-cell py-2 px-2 sm:px-3 text-right">Buy-In</th>
                  <th className="py-2 px-2 sm:px-3 text-right">Chips</th>
                  <th className="py-2 px-2 sm:px-3 text-right">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {sortedScoreboard.map((player, idx) => {
                  const isPositive = player.net > 0;
                  const isNegative = player.net < 0;

                  return (
                    <tr key={player.userId} className="hover:bg-parchment-200/30 transition-colors">
                      <td className="py-2 px-2 sm:px-3 flex items-center gap-1.5 sm:gap-2">
                        <span className="font-mono text-xs text-espresso-muted w-5 flex items-center justify-center shrink-0">
                          {sortMode === 'winners' ? (
                            player.net > 0 && idx === 0 ? (
                              <span title="1st Place" className="text-base select-none">🥇</span>
                            ) : player.net > 0 && idx === 1 ? (
                              <span title="2nd Place" className="text-base select-none">🥈</span>
                            ) : player.net > 0 && idx === 2 ? (
                              <span title="3rd Place" className="text-base select-none">🥉</span>
                            ) : (
                              `${idx + 1}.`
                            )
                          ) : (
                            player.net < 0 && idx === 0 ? (
                              <span title="#1 Biggest Deficit" className="text-base select-none">💸</span>
                            ) : player.net < 0 && idx === 1 ? (
                              <span title="#2 Deficit" className="text-base select-none">📉</span>
                            ) : player.net < 0 && idx === 2 ? (
                              <span title="#3 Deficit" className="text-base select-none">🥀</span>
                            ) : (
                              `${idx + 1}.`
                            )
                          )}
                        </span>
                        <span className="font-semibold text-espresso truncate max-w-[85px] sm:max-w-none">{player.username}</span>
                      </td>
                      <td className="hidden sm:table-cell py-2 px-2 sm:px-3 text-right font-mono text-espresso-muted">
                        {formatChips(player.buyIn)}
                      </td>
                      <td className="py-2 px-2 sm:px-3 text-right font-mono text-espresso">
                        {formatChips(player.finalChips)}
                      </td>
                      <td className="py-2 px-2 sm:px-3 text-right font-mono font-bold">
                        <span
                          className={
                            isPositive
                              ? 'text-felt'
                              : isNegative
                              ? 'text-wine'
                              : 'text-espresso-muted'
                          }
                        >
                          {isPositive ? `+${formatChips(player.net)}` : formatChips(player.net)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Debt Settlement Instructions */}
        <div className="space-y-2">
          <h3 className="font-serif text-xs font-semibold uppercase tracking-wider text-espresso-muted flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-felt" />
            <span>Settlement Transactions</span>
          </h3>

          <div className="rounded-lg border border-border bg-parchment-100/70 p-2.5 sm:p-3.5 space-y-2">
            {settlement.settlements.length === 0 ? (
              <p className="text-xs font-serif text-espresso-muted text-center py-2">
                All players broke even! No money needs to be transferred.
              </p>
            ) : (
              <div className="space-y-2">
                {settlement.settlements.map((tx, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs bg-parchment-50 p-2 sm:p-2.5 rounded border border-border/80 shadow-xs"
                  >
                    <div className="flex items-center gap-1.5 sm:gap-2 font-serif text-espresso">
                      <span className="font-semibold text-wine">{tx.fromUsername}</span>
                      <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-espresso-muted shrink-0" />
                      <span className="font-semibold text-felt">{tx.toUsername}</span>
                    </div>

                    <div className="font-mono font-bold text-espresso text-[11px] sm:text-xs bg-brass/20 px-2 py-0.5 rounded text-brass-dark border border-brass/30 self-start sm:self-auto">
                      pays {formatChips(tx.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end pt-2 border-t border-border/60">
          <Button
            variant="poker"
            size="sm"
            onClick={onClose}
            className="text-xs font-serif gap-2 px-5 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Return to Lobby</span>
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
