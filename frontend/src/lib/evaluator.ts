import { Card } from './gameTypes';

const RANK_NAMES: Record<number, string> = {
  14: 'Ace',
  13: 'King',
  12: 'Queen',
  11: 'Jack',
  10: '10',
  9: '9',
  8: '8',
  7: '7',
  6: '6',
  5: '5',
  4: '4',
  3: '3',
  2: '2',
};

const PLURAL_RANK_NAMES: Record<number, string> = {
  14: 'Aces',
  13: 'Kings',
  12: 'Queens',
  11: 'Jacks',
  10: '10s',
  9: '9s',
  8: '8s',
  7: '7s',
  6: '6s',
  5: '5s',
  4: '4s',
  3: '3s',
  2: '2s',
};

export interface EvaluatedHandResult {
  title: string;
  subtitle: string;
  rankLevel: number;
  score: number;
}

function evaluate5Cards(cards: Card[]): {
  score: number;
  handRank: string;
  rankLevel: number;
  description: string;
} {
  const sorted = [...cards].sort((a, b) => b.value - a.value);
  const isFlush = sorted.every((c) => c.suit === sorted[0].suit);

  let isStraight = false;
  let straightHigh = 0;

  if (
    sorted[0].value - sorted[1].value === 1 &&
    sorted[1].value - sorted[2].value === 1 &&
    sorted[2].value - sorted[3].value === 1 &&
    sorted[3].value - sorted[4].value === 1
  ) {
    isStraight = true;
    straightHigh = sorted[0].value;
  } else if (
    sorted[0].value === 14 &&
    sorted[1].value === 5 &&
    sorted[2].value === 4 &&
    sorted[3].value === 3 &&
    sorted[4].value === 2
  ) {
    isStraight = true;
    straightHigh = 5;
  }

  const countMap = new Map<number, number>();
  for (const c of sorted) {
    countMap.set(c.value, (countMap.get(c.value) || 0) + 1);
  }

  const groups = Array.from(countMap.entries()).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return b[0] - a[0];
  });

  const makeScore = (level: number, tieBreakers: number[]): number => {
    let score = level * Math.pow(16, 5);
    for (let i = 0; i < tieBreakers.length; i++) {
      score += tieBreakers[i] * Math.pow(16, 4 - i);
    }
    return score;
  };

  // Royal Flush / Straight Flush
  if (isFlush && isStraight) {
    if (straightHigh === 14) {
      return {
        score: makeScore(10, [14, 13, 12, 11, 10]),
        handRank: 'Royal Flush',
        rankLevel: 10,
        description: 'Royal Flush',
      };
    }
    return {
      score: makeScore(9, [straightHigh, 0, 0, 0, 0]),
      handRank: 'Straight Flush',
      rankLevel: 9,
      description: `Straight Flush (${RANK_NAMES[straightHigh]}-High)`,
    };
  }

  // Four of a Kind
  if (groups[0][1] === 4) {
    const quadVal = groups[0][0];
    const kicker = groups[1][0];
    return {
      score: makeScore(8, [quadVal, kicker, 0, 0, 0]),
      handRank: 'Four of a Kind',
      rankLevel: 8,
      description: `Four of a Kind (${PLURAL_RANK_NAMES[quadVal]})`,
    };
  }

  // Full House
  if (groups[0][1] === 3 && groups[1][1] === 2) {
    const tripVal = groups[0][0];
    const pairVal = groups[1][0];
    return {
      score: makeScore(7, [tripVal, pairVal, 0, 0, 0]),
      handRank: 'Full House',
      rankLevel: 7,
      description: `Full House (${PLURAL_RANK_NAMES[tripVal]} full of ${PLURAL_RANK_NAMES[pairVal]})`,
    };
  }

  // Flush
  if (isFlush) {
    return {
      score: makeScore(6, sorted.map((c) => c.value)),
      handRank: 'Flush',
      rankLevel: 6,
      description: `Flush (${RANK_NAMES[sorted[0].value]}-High)`,
    };
  }

  // Straight
  if (isStraight) {
    return {
      score: makeScore(5, [straightHigh, 0, 0, 0, 0]),
      handRank: 'Straight',
      rankLevel: 5,
      description: straightHigh === 5 ? 'Straight (5-High Wheel)' : `Straight (${RANK_NAMES[straightHigh]}-High)`,
    };
  }

  // Three of a Kind
  if (groups[0][1] === 3) {
    const tripVal = groups[0][0];
    const kickers = [groups[1][0], groups[2][0]];
    return {
      score: makeScore(4, [tripVal, kickers[0], kickers[1], 0, 0]),
      handRank: 'Three of a Kind',
      rankLevel: 4,
      description: `Three of a Kind (${PLURAL_RANK_NAMES[tripVal]})`,
    };
  }

  // Two Pair
  if (groups[0][1] === 2 && groups[1][1] === 2) {
    const highPair = Math.max(groups[0][0], groups[1][0]);
    const lowPair = Math.min(groups[0][0], groups[1][0]);
    const kicker = groups[2][0];
    return {
      score: makeScore(3, [highPair, lowPair, kicker, 0, 0]),
      handRank: 'Two Pair',
      rankLevel: 3,
      description: `Two Pair (${PLURAL_RANK_NAMES[highPair]} & ${PLURAL_RANK_NAMES[lowPair]})`,
    };
  }

  // One Pair
  if (groups[0][1] === 2) {
    const pairVal = groups[0][0];
    const kickers = [groups[1][0], groups[2][0], groups[3][0]];
    return {
      score: makeScore(2, [pairVal, kickers[0], kickers[1], kickers[2], 0]),
      handRank: 'One Pair',
      rankLevel: 2,
      description: `Pair of ${PLURAL_RANK_NAMES[pairVal]}`,
    };
  }

  // High Card
  return {
    score: makeScore(1, sorted.map((c) => c.value)),
    handRank: 'High Card',
    rankLevel: 1,
    description: `High Card (${RANK_NAMES[sorted[0].value]})`,
  };
}

export function evaluateHeroHand(
  holeCards: (Card | null)[],
  communityCards: Card[]
): EvaluatedHandResult | null {
  const validHole = holeCards.filter((c): c is Card => c !== null);
  if (validHole.length < 2) return null;

  const [c1, c2] = validHole;

  // Pre-flop (no community cards yet)
  if (!communityCards || communityCards.length < 3) {
    if (c1.rank === c2.rank) {
      return {
        title: `Pocket ${PLURAL_RANK_NAMES[c1.value]}`,
        subtitle: 'Pre-flop Pair',
        rankLevel: 2,
        score: 0,
      };
    }
    const highCard = c1.value >= c2.value ? c1 : c2;
    const lowCard = c1.value < c2.value ? c1 : c2;
    const suited = c1.suit === c2.suit ? 'Suited' : 'Offsuit';
    return {
      title: `${RANK_NAMES[highCard.value]}-${RANK_NAMES[lowCard.value]} ${suited}`,
      subtitle: 'Starting Hand',
      rankLevel: 1,
      score: 0,
    };
  }

  const allCards = [...validHole, ...communityCards];

  // 5 cards exact
  if (allCards.length === 5) {
    const result = evaluate5Cards(allCards);
    return {
      title: result.description,
      subtitle: result.handRank,
      rankLevel: result.rankLevel,
      score: result.score,
    };
  }

  // 6 or 7 cards -> choose best combination of 5
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

  let best: { score: number; handRank: string; rankLevel: number; description: string } | null = null;
  for (const combo of combinations) {
    const evaluated = evaluate5Cards(combo);
    if (!best || evaluated.score > best.score) {
      best = evaluated;
    }
  }

  if (!best) return null;

  return {
    title: best.description,
    subtitle: best.handRank,
    rankLevel: best.rankLevel,
    score: best.score,
  };
}
