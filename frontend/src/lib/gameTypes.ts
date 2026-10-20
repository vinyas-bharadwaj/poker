export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
  value: number;
}

export type BettingRound = 'idle' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
export type PlayerActionType = 'fold' | 'check' | 'call' | 'raise' | 'all-in';

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

export interface ClientPlayerInGame {
  userId: string;
  username: string;
  seatIndex: number;
  chips: number;
  currentBet: number;
  folded: boolean;
  isAllIn: boolean;
  isDealer: boolean;
  isTurn: boolean;
  cards: (Card | null)[];
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
  players: ClientPlayerInGame[];
  showdown?: ShowdownResult | null;
  handNumber: number;
}

export interface PlayerScoreboardEntry {
  userId: string;
  username: string;
  buyIn: number;
  finalChips: number;
  net: number; // positive = win, negative = loss
}

export interface DebtSettlementTransaction {
  fromUserId?: string;
  fromUsername: string;
  toUserId?: string;
  toUsername: string;
  amount: number;
}

export interface EndGameResult {
  roomCode: string;
  totalHands: number;
  scoreboard: PlayerScoreboardEntry[];
  settlements: DebtSettlementTransaction[];
  gameRecordId?: string;
}

