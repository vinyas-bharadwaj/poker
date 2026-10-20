export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
  value: number; // 2 to 14
}

export interface TableConfig {
  startingChips: number;
  smallBlind: number;
  bigBlind: number;
}

export type HandRank =
  | 'High Card'
  | 'One Pair'
  | 'Two Pair'
  | 'Three of a Kind'
  | 'Straight'
  | 'Flush'
  | 'Full House'
  | 'Four of a Kind'
  | 'Straight Flush'
  | 'Royal Flush';

export interface EvaluatedHand {
  score: number; // 32-bit integer for exact comparison
  handRank: HandRank;
  rankLevel: number; // 1 (High Card) to 10 (Royal Flush)
  description: string;
  bestFiveCards: Card[];
}

export type BettingRound = 'idle' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

export type PlayerActionType = 'fold' | 'check' | 'call' | 'raise' | 'all-in';

export interface PlayerInGame {
  userId: string;
  username: string;
  socketId: string;
  seatIndex: number;
  chips: number;
  currentBet: number; // Bet in current round
  totalHandBet: number; // Total contributed across all rounds in this hand
  folded: boolean;
  isAllIn: boolean;
  cards: Card[]; // Server-side hole cards (secret)
}

export interface Pot {
  amount: number;
  eligiblePlayerIds: string[];
}

export interface HandWinner {
  userId: string;
  username: string;
  amountWon: number;
  handDescription: string;
  bestFiveCards?: Card[];
  holeCards?: Card[];
}

export interface ShowdownResult {
  winners: HandWinner[];
  playerHands: {
    userId: string;
    username: string;
    cards: Card[];
    handDescription: string;
  }[];
  potsSummary: { amount: number; winners: string[] }[];
}

export interface ClientGameState {
  roomCode: string;
  round: BettingRound;
  communityCards: Card[];
  pot: number;
  currentTurnUserId: string | null;
  currentHighestBet: number;
  minRaiseAmount: number;
  dealerSeatIndex: number;
  smallBlindSeatIndex: number;
  bigBlindSeatIndex: number;
  players: {
    userId: string;
    username: string;
    seatIndex: number;
    chips: number;
    currentBet: number;
    folded: boolean;
    isAllIn: boolean;
    isDealer: boolean;
    isTurn: boolean;
    // Revealed hole cards for self, or at showdown, otherwise null/hidden
    cards: (Card | null)[];
  }[];
  showdown?: ShowdownResult | null;
  handNumber: number;
}
