import { Deck } from './deck';
import { PotManager } from './potManager';
import {
  Card,
  BettingRound,
  ClientGameState,
  PlayerInGame,
  PlayerActionType,
  ShowdownResult,
  TableConfig,
} from './types';

export class TexasHoldemEngine {
  public roomCode: string;
  public config: TableConfig;
  public players: PlayerInGame[] = [];
  public round: BettingRound = 'idle';
  public communityCards: Card[] = [];
  public currentTurnUserId: string | null = null;
  public currentHighestBet = 0;
  public minRaiseAmount = 0;
  public dealerSeatIndex = -1;
  public smallBlindSeatIndex = -1;
  public bigBlindSeatIndex = -1;
  public showdownResult: ShowdownResult | null = null;
  public handNumber = 0;

  private deck: Deck = new Deck();
  private actedThisRound: Set<string> = new Set();
  private lastRaiseUserId: string | null = null;

  constructor(roomCode: string, config: TableConfig) {
    this.roomCode = roomCode;
    this.config = config;
    this.minRaiseAmount = 1;
  }

  setPlayers(
    roomPlayers: { userId: string; username: string; socketId: string; chips: number }[]
  ): void {
    // Preserve existing chip stacks if available, otherwise use startingChips
    this.players = roomPlayers.map((rp, index) => {
      const existing = this.players.find((p) => p.userId === rp.userId);
      return {
        userId: rp.userId,
        username: rp.username,
        socketId: rp.socketId,
        seatIndex: index,
        chips: existing?.chips ?? rp.chips ?? this.config.startingChips,
        currentBet: 0,
        totalHandBet: 0,
        folded: false,
        isAllIn: false,
        cards: [],
      };
    });
  }

  /**
   * Starts a new Texas Hold'em hand:
   * Moves dealer button, posts SB & BB, deals 2 hole cards to each player with chips.
   */
  startNewHand(): boolean {
    const activeWithChips = this.players.filter((p) => p.chips > 0);
    if (activeWithChips.length < 2) {
      this.round = 'idle';
      this.currentTurnUserId = null;
      return false;
    }

    this.handNumber++;
    this.deck.reset();
    this.communityCards = [];
    this.showdownResult = null;
    this.actedThisRound.clear();
    this.lastRaiseUserId = null;

    // Reset player state for the hand
    for (const player of this.players) {
      player.currentBet = 0;
      player.totalHandBet = 0;
      player.folded = player.chips <= 0;
      player.isAllIn = false;
      player.cards = [];
    }

    // Rotate dealer button to next eligible player
    this.dealerSeatIndex = this.findNextSeatWithChips(this.dealerSeatIndex);

    // Determine Small Blind and Big Blind seats
    const numActive = activeWithChips.length;
    if (numActive === 2) {
      // Heads-up: Dealer is Small Blind, other player is Big Blind
      this.smallBlindSeatIndex = this.dealerSeatIndex;
      this.bigBlindSeatIndex = this.findNextSeatWithChips(this.dealerSeatIndex);
    } else {
      this.smallBlindSeatIndex = this.findNextSeatWithChips(this.dealerSeatIndex);
      this.bigBlindSeatIndex = this.findNextSeatWithChips(this.smallBlindSeatIndex);
    }

    // Post Small Blind
    const sbPlayer = this.players[this.smallBlindSeatIndex];
    const sbAmount = Math.min(sbPlayer.chips, this.config.smallBlind);
    this.postBet(sbPlayer, sbAmount);

    // Post Big Blind
    const bbPlayer = this.players[this.bigBlindSeatIndex];
    const bbAmount = Math.min(bbPlayer.chips, this.config.bigBlind);
    this.postBet(bbPlayer, bbAmount);

    this.currentHighestBet = this.config.bigBlind;
    this.minRaiseAmount = 1;

    // Deal 2 hole cards to each active player
    for (let i = 0; i < 2; i++) {
      for (const player of this.players) {
        if (!player.folded) {
          player.cards.push(this.deck.deal());
        }
      }
    }

    this.round = 'preflop';

    // First to act pre-flop is the player to the left of the Big Blind (Under The Gun)
    // In heads-up (2 players), the dealer (SB) acts first pre-flop
    if (numActive === 2) {
      this.currentTurnUserId = sbPlayer.userId;
    } else {
      const utgIndex = this.findNextSeatWithChips(this.bigBlindSeatIndex);
      this.currentTurnUserId = this.players[utgIndex].userId;
    }

    return true;
  }

  /**
   * Handles a player's betting action: fold, check, call, or raise.
   */
  handlePlayerAction(
    userId: string,
    action: PlayerActionType,
    amount?: number
  ): { success: boolean; error?: string; handEnded?: boolean } {
    if (this.round === 'idle' || this.round === 'showdown') {
      return { success: false, error: 'No hand is currently active.' };
    }

    if (this.currentTurnUserId !== userId) {
      return { success: false, error: 'It is not your turn to act.' };
    }

    const player = this.players.find((p) => p.userId === userId);
    if (!player || player.folded || player.isAllIn) {
      return { success: false, error: 'Player cannot act.' };
    }

    const toCall = this.currentHighestBet - player.currentBet;

    switch (action) {
      case 'fold': {
        player.folded = true;
        this.actedThisRound.add(player.userId);

        // Check if only one player remains
        const remaining = this.players.filter((p) => !p.folded);
        if (remaining.length === 1) {
          this.awardPotToLastStandingPlayer(remaining[0]);
          return { success: true, handEnded: true };
        }
        break;
      }

      case 'check': {
        if (toCall > 0) {
          return {
            success: false,
            error: `Cannot check: There is a bet of ₹${toCall} to call.`,
          };
        }
        this.actedThisRound.add(player.userId);
        break;
      }

      case 'call': {
        if (toCall <= 0) {
          // If nothing to call, treating call as check
          this.actedThisRound.add(player.userId);
          break;
        }

        const callAmount = Math.min(player.chips, toCall);
        this.postBet(player, callAmount);
        this.actedThisRound.add(player.userId);
        break;
      }

      case 'raise': {
        const rawAmount = amount ?? (this.currentHighestBet + 1);
        const targetBet = Math.floor(rawAmount);
        const additionNeeded = targetBet - player.currentBet;

        if (additionNeeded <= 0) {
          return { success: false, error: 'Raise amount must exceed current bet.' };
        }

        // All-in exception: if player pushes all chips, they can raise even if less than minRaise
        if (additionNeeded >= player.chips) {
          // Player is shoving all-in
          const totalAfterShove = player.currentBet + player.chips;
          const actualRaise = totalAfterShove - this.currentHighestBet;

          this.postBet(player, player.chips);

          if (actualRaise > 0) {
            this.currentHighestBet = totalAfterShove;
            // Re-open betting for other players who haven't matched this raise
            this.lastRaiseUserId = player.userId;
            this.actedThisRound.clear();
          }
          this.actedThisRound.add(player.userId);
          break;
        }

        // Arbitrary raise validation:
        // Any raise must exceed the current highest bet by at least ₹1 (not limited to multiples of previous raise)
        const raiseDifference = targetBet - this.currentHighestBet;
        if (raiseDifference <= 0) {
          return {
            success: false,
            error: `Raise must exceed the current bet of ₹${this.currentHighestBet}.`,
          };
        }

        this.postBet(player, additionNeeded);
        this.currentHighestBet = targetBet;
        this.lastRaiseUserId = player.userId;

        // Re-open betting for others
        this.actedThisRound.clear();
        this.actedThisRound.add(player.userId);
        break;
      }

      case 'all-in': {
        if (player.chips <= 0) {
          return { success: false, error: 'No chips left to go all-in.' };
        }
        const totalAfterShove = player.currentBet + player.chips;
        const actualRaise = totalAfterShove - this.currentHighestBet;

        this.postBet(player, player.chips);

        if (actualRaise > 0) {
          this.currentHighestBet = totalAfterShove;
          this.lastRaiseUserId = player.userId;
          this.actedThisRound.clear();
        }
        this.actedThisRound.add(player.userId);
        break;
      }
    }

    // Progress the betting round or advance to next player
    const handEnded = this.finishTurnOrAdvance();
    return { success: true, handEnded };
  }

  private finishTurnOrAdvance(): boolean {
    // Check if betting round is complete
    if (this.isBettingRoundComplete()) {
      return this.advanceToNextRound();
    }

    // Advance turn to next active, non-all-in player
    this.currentTurnUserId = this.findNextTurnPlayer();
    return false;
  }

  private isBettingRoundComplete(): boolean {
    const activePlayers = this.players.filter((p) => !p.folded);

    // If only one player is active, hand is over
    if (activePlayers.length <= 1) return true;

    // Players who are not all-in must have acted and matched the highest bet
    for (const player of activePlayers) {
      if (!player.isAllIn) {
        if (!this.actedThisRound.has(player.userId)) return false;
        if (player.currentBet !== this.currentHighestBet) return false;
      }
    }

    return true;
  }

  private advanceToNextRound(): boolean {
    // Reset round bets
    for (const player of this.players) {
      player.currentBet = 0;
    }
    this.currentHighestBet = 0;
    this.minRaiseAmount = 1;
    this.actedThisRound.clear();
    this.lastRaiseUserId = null;

    // Check if all players or all-but-one are all-in: if so, run out the board!
    const canBetPlayers = this.players.filter((p) => !p.folded && !p.isAllIn);
    const runoutNeeded = canBetPlayers.length <= 1;

    switch (this.round) {
      case 'preflop': {
        this.round = 'flop';
        this.deck.burn();
        this.communityCards.push(this.deck.deal(), this.deck.deal(), this.deck.deal());
        break;
      }
      case 'flop': {
        this.round = 'turn';
        this.deck.burn();
        this.communityCards.push(this.deck.deal());
        break;
      }
      case 'turn': {
        this.round = 'river';
        this.deck.burn();
        this.communityCards.push(this.deck.deal());
        break;
      }
      case 'river': {
        this.round = 'showdown';
        this.resolveShowdown();
        return true;
      }
    }

    if (runoutNeeded && this.round !== 'showdown') {
      // Automatically advance until showdown without pausing for actions
      return this.advanceToNextRound();
    }

    // Next turn post-flop starts at the first active player left of the dealer button
    const firstToActIndex = this.findNextActiveSeat(this.dealerSeatIndex);
    this.currentTurnUserId =
      firstToActIndex !== -1 ? this.players[firstToActIndex].userId : null;

    return false;
  }

  private resolveShowdown(): void {
    const pots = PotManager.buildPots(this.players);
    const { winners, potsSummary } = PotManager.distributePots(
      pots,
      this.players,
      this.communityCards
    );

    // Credit chips to winners
    for (const winner of winners) {
      const p = this.players.find((pl) => pl.userId === winner.userId);
      if (p) {
        p.chips += winner.amountWon;
      }
    }

    this.showdownResult = {
      winners,
      playerHands: this.players
        .filter((p) => !p.folded && p.cards.length >= 2)
        .map((p) => {
          const winnerInfo = winners.find((w) => w.userId === p.userId);
          return {
            userId: p.userId,
            username: p.username,
            cards: p.cards,
            handDescription: winnerInfo?.handDescription || 'Showdown Hand',
          };
        }),
      potsSummary,
    };

    this.currentTurnUserId = null;
  }

  public awardPotToLastStandingPlayer(lastPlayer: PlayerInGame): void {
    const pots = PotManager.buildPots(this.players);
    const totalPot = pots.reduce((sum, p) => sum + p.amount, 0);

    lastPlayer.chips += totalPot;

    this.round = 'showdown';
    this.showdownResult = {
      winners: [
        {
          userId: lastPlayer.userId,
          username: lastPlayer.username,
          amountWon: totalPot,
          handDescription: 'All opponents folded',
          holeCards: lastPlayer.cards,
        },
      ],
      playerHands: [
        {
          userId: lastPlayer.userId,
          username: lastPlayer.username,
          cards: lastPlayer.cards,
          handDescription: 'All opponents folded',
        },
      ],
      potsSummary: [{ amount: totalPot, winners: [lastPlayer.username] }],
    };

    this.currentTurnUserId = null;
  }

  private postBet(player: PlayerInGame, amount: number): void {
    player.chips -= amount;
    player.currentBet += amount;
    player.totalHandBet += amount;

    if (player.chips === 0) {
      player.isAllIn = true;
    }
  }

  private findNextSeatWithChips(startIndex: number): number {
    let index = startIndex;
    for (let i = 0; i < this.players.length; i++) {
      index = (index + 1) % this.players.length;
      if (this.players[index].chips > 0) {
        return index;
      }
    }
    return (startIndex + 1) % this.players.length;
  }

  private findNextActiveSeat(startIndex: number): number {
    let index = startIndex;
    for (let i = 0; i < this.players.length; i++) {
      index = (index + 1) % this.players.length;
      const p = this.players[index];
      if (!p.folded && !p.isAllIn) {
        return index;
      }
    }
    return -1;
  }

  private findNextTurnPlayer(): string | null {
    const currentSeat = this.players.findIndex(
      (p) => p.userId === this.currentTurnUserId
    );
    const nextSeat = this.findNextActiveSeat(currentSeat);
    return nextSeat !== -1 ? this.players[nextSeat].userId : null;
  }

  /**
   * Returns secure sanitized game state for a specific player:
   * Hole cards of other players are hidden as null until showdown!
   */
  getClientState(forUserId?: string): ClientGameState {
    const totalPot = this.players.reduce((sum, p) => sum + p.totalHandBet, 0);

    return {
      roomCode: this.roomCode,
      round: this.round,
      communityCards: this.communityCards,
      pot: totalPot,
      currentTurnUserId: this.currentTurnUserId,
      currentHighestBet: this.currentHighestBet,
      minRaiseAmount: this.minRaiseAmount,
      dealerSeatIndex: this.dealerSeatIndex,
      smallBlindSeatIndex: this.smallBlindSeatIndex,
      bigBlindSeatIndex: this.bigBlindSeatIndex,
      players: this.players.map((p) => {
        // Show cards if it's the player themselves, or if we are at showdown and player didn't fold (unless won by all others folding)
        const isFoldWin =
          this.showdownResult?.winners.length === 1 &&
          this.showdownResult.winners[0].handDescription === 'All opponents folded';
        const revealCards =
          p.userId === forUserId ||
          (this.round === 'showdown' && !p.folded && !isFoldWin);

        return {
          userId: p.userId,
          username: p.username,
          seatIndex: p.seatIndex,
          chips: p.chips,
          currentBet: p.currentBet,
          folded: p.folded,
          isAllIn: p.isAllIn,
          isDealer: p.seatIndex === this.dealerSeatIndex,
          isTurn: p.userId === this.currentTurnUserId,
          cards: revealCards ? p.cards : (p.cards.length > 0 ? [null, null] : []),
        };
      }),
      showdown: this.showdownResult,
      handNumber: this.handNumber,
    };
  }
}
