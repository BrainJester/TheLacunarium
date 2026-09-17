// Card utilities
const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

export const SUIT_SYMBOLS = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
export const SUIT_COLORS = { hearts: '#e53e3e', diamonds: '#e53e3e', clubs: '#1a1a2e', spades: '#1a1a2e' };

// Face value used for SCORING (blackjack style — A can be 1 or 11)
export function rankValue(rank) {
  if (rank === 'A') return 11;
  if (rank === 'K') return 13;
  if (rank === 'Q') return 12;
  if (rank === 'J') return 11;
  return parseInt(rank);
}

// VP value (hearts) and chip value (diamonds) — face value for display
export function rankDisplayValue(rank) {
  if (rank === 'A') return 14;
  if (rank === 'K') return 13;
  if (rank === 'Q') return 12;
  if (rank === 'J') return 11;
  return parseInt(rank);
}

export function cardCost(rank) {
  return rankDisplayValue(rank); // 2–14
}

export function createCard(suit, rank) {
  return { suit, rank, id: `${rank}_${suit}_${Math.random().toString(36).slice(2,8)}` };
}

export function calcHandScore(cards) {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.rank === 'A') { aces++; total += 11; }
    else if (c.rank === 'K' || c.rank === 'Q' || c.rank === 'J') total += 10;
    else total += parseInt(c.rank);
  }
  // Reduce aces from 11 to 1 to avoid bust
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

export function createFullDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(createCard(suit, rank));
    }
  }
  return deck;
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Returns the suits a card counts as for ability triggering.
export function getCardSuits(card) {
  return [card.suit];
}

// Spade burn: all from discard, always optional ("up to").
export function getSpadeAbility(rank) {
  if (rank === 'J') return { discardBurn: 1, optional: true };
  if (rank === 'Q') return { discardBurn: 2, optional: true };
  if (rank === 'K') return { discardBurn: 2, optional: true };
  if (rank === 'A') return { discardBurn: 3, optional: true };
  // base (2-10)
  return { discardBurn: 1, optional: true };
}

// Club scry: deck only, always optional ("up to").
export function getClubAbility(rank) {
  if (rank === 'J') return { deckScry: 1, optional: true };
  if (rank === 'Q') return { deckScry: 2, optional: true };
  if (rank === 'K') return { deckScry: 2, optional: true };
  if (rank === 'A') return { deckScry: 3, optional: true };
  // base (2-10)
  return { deckScry: 1, optional: true };
}

export function initializeGame(players) {
  const allCards = [];
  for (let p = 0; p < players.length; p++) {
    allCards.push(...createFullDeck());
  }

  const playerStates = players.map((p, idx) => {
    const startDeck = RANKS.map(r => createCard('diamonds', r));
    return {
      ...p,
      index: idx,
      deck: shuffle(startDeck),
      discard: [],
      hands: [],
      diamonds: 0,
      bonusDiamonds: 0,
      totalHeartValue: 0,
    };
  });

  const shopCards = allCards.filter(c => c.suit !== 'diamonds');
  const shopDeck = shuffle(shopCards);

  return {
    players: playerStates,
    shopDeck,
    shopDisplay: [],
    round: 0,
    phase: 'draw',
    currentPlayerIndex: 0,
    turnOrder: [],
    log: [],
    gameOver: false,
    winner: null,
  };
}

export function drawFromPlayerDeck(player) {
  if (player.deck.length === 0) {
    if (player.discard.length === 0) return null;
    player.deck = shuffle(player.discard);
    player.discard = [];
    player.shuffling = true;
  }
  const card = player.deck.pop();
  return card ? { ...card, _fromPlayerDeck: true } : null;
}

export function drawFromShopDeck(state) {
  if (state.shopDeck.length === 0) return null;
  return state.shopDeck.pop();
}

export function getActiveHandIndex(player) {
  for (let i = 0; i < player.hands.length; i++) {
    if (!player.hands[i].done) return i;
  }
  return -1;
}

export function calcHandDiamonds(hand) {
  if (hand.busted) return 0;
  return Math.max(0, calcHandScore(hand.cards) - 10);
}

export function getPlayOrder(players) {
  const active = players
    .map((p, i) => ({ index: i, score: getLowestActiveScore(p) }))
    .filter(p => p.score >= 0)
    .sort((a, b) => a.score - b.score);
  return active.map(a => a.index);
}

function getLowestActiveScore(player) {
  let lowest = Infinity;
  for (const h of player.hands) {
    if (!h.done) {
      const s = calcHandScore(h.cards);
      if (s < lowest) lowest = s;
    }
  }
  return lowest === Infinity ? -1 : lowest;
}

export function getBuyOrder(players) {
  return [...players]
    .sort((a, b) => a.diamonds - b.diamonds)
    .map(p => p.index);
}

export function countHeartValue(player) {
  let total = 0;
  for (const c of player.deck) {
    const suits = getCardSuits(c);
    if (suits.includes('hearts')) total += rankDisplayValue(c.rank);
  }
  for (const c of player.discard) {
    const suits = getCardSuits(c);
    if (suits.includes('hearts')) total += rankDisplayValue(c.rank);
  }
  return total;
}

export function isShopEmpty(state) {
  return state.shopDeck.length === 0 && state.shopDisplay.length === 0;
}

export function calcBustProbability(player, currentHandCards, knownTopCard = null) {
  const currentScore = calcHandScore(currentHandCards);

  if (knownTopCard) {
    const testCards = [...currentHandCards, knownTopCard];
    return calcHandScore(testCards) > 21 ? 100 : 0;
  }

  const pool = [...player.deck, ...player.discard];
  if (pool.length === 0) return 0;

  let bustCount = 0;
  for (const card of pool) {
    const testCards = [...currentHandCards, card];
    if (calcHandScore(testCards) > 21) bustCount++;
  }
  return Math.round((bustCount / pool.length) * 100);
}