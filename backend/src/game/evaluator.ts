import { Card, EvaluatedHand, HandRank, Rank } from './types';

const RANK_NAMES: Record<number, string> = {
  14: 'Ace',
  13: 'King',
  12: 'Queen',
  11: 'Jack',
  10: 'Ten',
  9: 'Nine',
  8: 'Eight',
  7: 'Seven',
  6: 'Six',
  5: 'Five',
  4: 'Four',
  3: 'Three',
  2: 'Two',
};

const PLURAL_RANK_NAMES: Record<number, string> = {
  14: 'Aces',
  13: 'Kings',
  12: 'Queens',
  11: 'Jacks',
  10: 'Tens',
  9: 'Nines',
  8: 'Eights',
  7: 'Sevens',
  6: 'Sixes',
  5: 'Fives',
  4: 'Fours',
  3: 'Threes',
  2: 'Twos',
};

/**
 * Evaluates a 5-card poker hand and produces an exact numerical score
 * and human-readable description.
 */
export function evaluate5Cards(cards: Card[]): EvaluatedHand {
  if (cards.length !== 5) {
    throw new Error('evaluate5Cards requires exactly 5 cards');
  }

  // Sort cards descending by value
  const sorted = [...cards].sort((a, b) => b.value - a.value);

  const isFlush = sorted.every((c) => c.suit === sorted[0].suit);

  // Check straight
  let isStraight = false;
  let straightHigh = 0;

  // Standard straight check
  if (
    sorted[0].value - sorted[1].value === 1 &&
    sorted[1].value - sorted[2].value === 1 &&
    sorted[2].value - sorted[3].value === 1 &&
    sorted[3].value - sorted[4].value === 1
  ) {
    isStraight = true;
    straightHigh = sorted[0].value;
  } else if (
    // Wheel straight: A-2-3-4-5 (values: 14, 5, 4, 3, 2)
    sorted[0].value === 14 &&
    sorted[1].value === 5 &&
    sorted[2].value === 4 &&
    sorted[3].value === 3 &&
    sorted[4].value === 2
  ) {
    isStraight = true;
    straightHigh = 5; // 5-high straight
  }

  // Rank frequency counts
  const countMap: Map<number, number> = new Map();
  for (const c of sorted) {
    countMap.set(c.value, (countMap.get(c.value) || 0) + 1);
  }

  // Group by frequency descending, then value descending
  const groups = Array.from(countMap.entries()).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1]; // higher count first
    return b[0] - a[0]; // higher rank first
  });

  // Calculate base score: Level * 16^5 + tie breakers
  const makeScore = (level: number, tieBreakers: number[]): number => {
    let score = level * Math.pow(16, 5);
    for (let i = 0; i < tieBreakers.length; i++) {
      score += tieBreakers[i] * Math.pow(16, 4 - i);
    }
    return score;
  };

  // 1. Royal Flush & Straight Flush
  if (isFlush && isStraight) {
    if (straightHigh === 14) {
      return {
        score: makeScore(10, [14, 13, 12, 11, 10]),
        handRank: 'Royal Flush',
        rankLevel: 10,
        description: `Royal Flush of ${sorted[0].suit}`,
        bestFiveCards: sorted,
      };
    }
    return {
      score: makeScore(9, [straightHigh, 0, 0, 0, 0]),
      handRank: 'Straight Flush',
      rankLevel: 9,
      description: `Straight Flush, ${RANK_NAMES[straightHigh]} high`,
      bestFiveCards: sorted,
    };
  }

  // 2. Four of a Kind
  if (groups[0][1] === 4) {
    const quadVal = groups[0][0];
    const kicker = groups[1][0];
    return {
      score: makeScore(8, [quadVal, kicker, 0, 0, 0]),
      handRank: 'Four of a Kind',
      rankLevel: 8,
      description: `Four of a Kind, ${PLURAL_RANK_NAMES[quadVal]}`,
      bestFiveCards: sorted,
    };
  }

  // 3. Full House
  if (groups[0][1] === 3 && groups[1][1] === 2) {
    const tripVal = groups[0][0];
    const pairVal = groups[1][0];
    return {
      score: makeScore(7, [tripVal, pairVal, 0, 0, 0]),
      handRank: 'Full House',
      rankLevel: 7,
      description: `Full House, ${PLURAL_RANK_NAMES[tripVal]} full of ${PLURAL_RANK_NAMES[pairVal]}`,
      bestFiveCards: sorted,
    };
  }

  // 4. Flush
  if (isFlush) {
    return {
      score: makeScore(6, sorted.map((c) => c.value)),
      handRank: 'Flush',
      rankLevel: 6,
      description: `Flush, ${RANK_NAMES[sorted[0].value]} high`,
      bestFiveCards: sorted,
    };
  }

  // 5. Straight
  if (isStraight) {
    return {
      score: makeScore(5, [straightHigh, 0, 0, 0, 0]),
      handRank: 'Straight',
      rankLevel: 5,
      description:
        straightHigh === 5
          ? 'Wheel Straight, Five high'
          : `Straight, ${RANK_NAMES[straightHigh]} high`,
      bestFiveCards: sorted,
    };
  }

  // 6. Three of a Kind
  if (groups[0][1] === 3) {
    const tripVal = groups[0][0];
    const kickers = [groups[1][0], groups[2][0]];
    return {
      score: makeScore(4, [tripVal, kickers[0], kickers[1], 0, 0]),
      handRank: 'Three of a Kind',
      rankLevel: 4,
      description: `Three of a Kind, ${PLURAL_RANK_NAMES[tripVal]}`,
      bestFiveCards: sorted,
    };
  }

  // 7. Two Pair
  if (groups[0][1] === 2 && groups[1][1] === 2) {
    const highPair = Math.max(groups[0][0], groups[1][0]);
    const lowPair = Math.min(groups[0][0], groups[1][0]);
    const kicker = groups[2][0];
    return {
      score: makeScore(3, [highPair, lowPair, kicker, 0, 0]),
      handRank: 'Two Pair',
      rankLevel: 3,
      description: `Two Pair, ${PLURAL_RANK_NAMES[highPair]} and ${PLURAL_RANK_NAMES[lowPair]}`,
      bestFiveCards: sorted,
    };
  }

  // 8. One Pair
  if (groups[0][1] === 2) {
    const pairVal = groups[0][0];
    const kickers = [groups[1][0], groups[2][0], groups[3][0]];
    return {
      score: makeScore(2, [pairVal, kickers[0], kickers[1], kickers[2], 0]),
      handRank: 'One Pair',
      rankLevel: 2,
      description: `One Pair of ${PLURAL_RANK_NAMES[pairVal]}`,
      bestFiveCards: sorted,
    };
  }

  // 9. High Card
  return {
    score: makeScore(1, sorted.map((c) => c.value)),
    handRank: 'High Card',
    rankLevel: 1,
    description: `High Card, ${RANK_NAMES[sorted[0].value]}`,
    bestFiveCards: sorted,
  };
}

/**
 * Evaluates the best 5-card hand from up to 7 cards (2 hole cards + up to 5 community cards).
 * Generates all 21 combinations and returns the best evaluated hand.
 */
export function evaluate7Cards(holeCards: Card[], communityCards: Card[]): EvaluatedHand {
  const allCards = [...holeCards, ...communityCards];

  if (allCards.length < 5) {
    throw new Error('At least 5 total cards are required to evaluate a hand');
  }

  // If exactly 5 cards, evaluate directly
  if (allCards.length === 5) {
    return evaluate5Cards(allCards);
  }

  // Generate all 5-card combinations
  const combinations: Card[][] = [];

  function getCombinations(start: number, combo: Card[]) {
    if (combo.length === 5) {
      combinations.push([...combo]);
      return;
    }
    for (let i = start; i < allCards.length; i++) {
      combo.push(allCards[i]);
      getCombinations(i + 1, combo);
      combo.pop();
    }
  }

  getCombinations(0, []);

  // Find the combination with the maximum score
  let bestHand: EvaluatedHand | null = null;

  for (const combo of combinations) {
    const evaluated = evaluate5Cards(combo);
    if (!bestHand || evaluated.score > bestHand.score) {
      bestHand = evaluated;
    }
  }

  return bestHand!;
}
