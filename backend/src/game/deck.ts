import crypto from 'crypto';
import { Card, Suit, Rank } from './types';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: { rank: Rank; value: number }[] = [
  { rank: '2', value: 2 },
  { rank: '3', value: 3 },
  { rank: '4', value: 4 },
  { rank: '5', value: 5 },
  { rank: '6', value: 6 },
  { rank: '7', value: 7 },
  { rank: '8', value: 8 },
  { rank: '9', value: 9 },
  { rank: '10', value: 10 },
  { rank: 'J', value: 11 },
  { rank: 'Q', value: 12 },
  { rank: 'K', value: 13 },
  { rank: 'A', value: 14 },
];

export class Deck {
  private cards: Card[] = [];

  constructor() {
    this.reset();
  }

  reset(): void {
    this.cards = [];
    for (const suit of SUITS) {
      for (const { rank, value } of RANKS) {
        this.cards.push({ suit, rank, value });
      }
    }
    this.shuffle();
  }

  /**
   * Fisher-Yates shuffle using cryptographically secure random integers (crypto.randomInt).
   * Ensures provably fair and unbiased distribution.
   */
  shuffle(): void {
    for (let i = this.cards.length - 1; i > 0; i--) {
      // crypto.randomInt is unbiased in the range [0, i + 1)
      const j = crypto.randomInt(0, i + 1);
      const temp = this.cards[i];
      this.cards[i] = this.cards[j];
      this.cards[j] = temp;
    }
  }

  deal(): Card {
    const card = this.cards.pop();
    if (!card) {
      throw new Error('Deck is depleted');
    }
    return card;
  }

  burn(): void {
    if (this.cards.length > 0) {
      this.cards.pop();
    }
  }

  remaining(): number {
    return this.cards.length;
  }
}
