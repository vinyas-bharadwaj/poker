import { Card, EvaluatedHand, HandWinner, PlayerInGame, Pot } from './types';
import { evaluate7Cards } from './evaluator';

export interface PotCalculationResult {
  pots: Pot[];
  totalPot: number;
}

export class PotManager {
  /**
   * Constructs side pots and main pot from player total hand contributions.
   */
  static buildPots(players: PlayerInGame[]): Pot[] {
    // Only consider players who contributed chips
    const contributors = players.filter((p) => p.totalHandBet > 0);
    if (contributors.length === 0) return [];

    // Find unique non-zero contribution amounts from all-in or active players
    const contributionLevels = Array.from(
      new Set(contributors.map((p) => p.totalHandBet))
    ).sort((a, b) => a - b);

    const pots: Pot[] = [];
    let previousLevel = 0;

    for (const level of contributionLevels) {
      const tierSize = level - previousLevel;
      if (tierSize <= 0) continue;

      let potAmount = 0;
      const eligiblePlayerIds: string[] = [];

      for (const p of contributors) {
        if (p.totalHandBet > previousLevel) {
          // This player contributed to this tier
          const contributionInTier = Math.min(p.totalHandBet - previousLevel, tierSize);
          potAmount += contributionInTier;

          // Eligible only if the player did not fold
          if (!p.folded) {
            eligiblePlayerIds.push(p.userId);
          }
        }
      }

      if (potAmount > 0 && eligiblePlayerIds.length > 0) {
        // If the last pot has the same eligible players, merge them
        const lastPot = pots[pots.length - 1];
        if (
          lastPot &&
          lastPot.eligiblePlayerIds.length === eligiblePlayerIds.length &&
          lastPot.eligiblePlayerIds.every((id) => eligiblePlayerIds.includes(id))
        ) {
          lastPot.amount += potAmount;
        } else {
          pots.push({
            amount: potAmount,
            eligiblePlayerIds,
          });
        }
      } else if (potAmount > 0 && eligiblePlayerIds.length === 0 && pots.length > 0) {
        // If no one is eligible (e.g. all players in tier folded), add to previous pot
        pots[pots.length - 1].amount += potAmount;
      }

      previousLevel = level;
    }

    return pots;
  }

  /**
   * Distributes pots to winners based on evaluated hands, handling ties and split pots.
   */
  static distributePots(
    pots: Pot[],
    players: PlayerInGame[],
    communityCards: Card[]
  ): {
    winners: HandWinner[];
    potsSummary: { amount: number; winners: string[] }[];
  } {
    // Pre-evaluate hands for all non-folded players
    const evaluatedMap = new Map<string, EvaluatedHand>();
    for (const player of players) {
      if (!player.folded && player.cards.length >= 2) {
        evaluatedMap.set(
          player.userId,
          evaluate7Cards(player.cards, communityCards)
        );
      }
    }

    const winningsMap = new Map<string, number>();
    const potsSummary: { amount: number; winners: string[] }[] = [];

    for (const pot of pots) {
      if (pot.amount <= 0 || pot.eligiblePlayerIds.length === 0) continue;

      // Find highest score among eligible players
      let bestScore = -1;
      let winningUserIds: string[] = [];

      for (const userId of pot.eligiblePlayerIds) {
        const evalHand = evaluatedMap.get(userId);
        if (!evalHand) continue;

        if (evalHand.score > bestScore) {
          bestScore = evalHand.score;
          winningUserIds = [userId];
        } else if (evalHand.score === bestScore) {
          winningUserIds.push(userId); // Tie! Split pot
        }
      }

      if (winningUserIds.length === 0) continue;

      // Split pot equally among tied winners
      const splitShare = Math.floor(pot.amount / winningUserIds.length);
      let remainder = pot.amount % winningUserIds.length;

      for (const winnerId of winningUserIds) {
        const extra = remainder > 0 ? 1 : 0;
        if (remainder > 0) remainder--;

        const totalWon = splitShare + extra;
        winningsMap.set(winnerId, (winningsMap.get(winnerId) || 0) + totalWon);
      }

      potsSummary.push({
        amount: pot.amount,
        winners: winningUserIds.map(
          (id) => players.find((p) => p.userId === id)?.username || id
        ),
      });
    }

    // Format results
    const winners: HandWinner[] = [];
    for (const [userId, amountWon] of winningsMap.entries()) {
      const player = players.find((p) => p.userId === userId);
      const evalHand = evaluatedMap.get(userId);

      if (player && amountWon > 0) {
        winners.push({
          userId: player.userId,
          username: player.username,
          amountWon,
          handDescription: evalHand?.description || 'Fold Win',
          bestFiveCards: evalHand?.bestFiveCards,
          holeCards: player.cards,
        });
      }
    }

    return { winners, potsSummary };
  }
}
