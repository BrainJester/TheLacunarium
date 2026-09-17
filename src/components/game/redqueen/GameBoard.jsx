import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Hand, Square, RotateCcw, ArrowRight, HelpCircle } from 'lucide-react';

import PlayerHandDisplay from './PlayerHandDisplay';
import ShopDisplay from './ShopDisplay';
import AbilityChoiceDialog from './AbilityChoiceDialog';
import GameOverScreen from './GameOverScreen';
import RulesModal from './RulesModal';
import GameLog from './GameLog';
import {
  initializeGame, drawFromPlayerDeck,
  calcHandScore, calcHandDiamonds, getBuyOrder,
  getActiveHandIndex, cardCost, countHeartValue,
  SUIT_SYMBOLS, calcBustProbability,
  getSpadeAbility, getClubAbility,
} from '@/lib/redQueenEngine';

export default function GameBoard({ players, onRestart }) {
  const [state, renderState] = useState(() => initializeGame(players));
  const [pendingAbility, setPendingAbility] = useState(null);
  const pendingAbilityRef = useRef(null);
  const abilityQueueRef = useRef([]);
  const openingCheckRef = useRef([]);
  const [showRules, setShowRules] = useState(false);
  const [flash21, setFlash21] = useState({});
  const [flashBust, setFlashBust] = useState({});
  const [flashCharlie, setFlashCharlie] = useState({});
  const aiTimeoutRef = useRef(null);
  const stateRef = useRef(state);
  const timers = useRef(new Set());
  // Apply transitions outside React updater callbacks: draws and scheduled effects
  // execute once, and each transition owns its nested decks and hands.
  function setState(transition) {
    const next = transition(structuredClone(stateRef.current));
    stateRef.current = next; renderState(next);
  }
  function schedule(callback, delay) {
    const round = stateRef.current.round;
    const timer = window.setTimeout(() => {
      timers.current.delete(timer);
      if (stateRef.current.round === round) callback();
    }, delay);
    timers.current.add(timer); return timer;
  }

  useEffect(() => {
    startNewRound();
    return () => { timers.current.forEach(clearTimeout); timers.current.clear(); };
  }, []);

  useEffect(() => {
    const shufflingPlayers = state.players.filter(p => p.shuffling);
    if (shufflingPlayers.length === 0) return;
    const timer = schedule(() => {
      setState(prev => ({
        ...prev,
        players: prev.players.map(p => p.shuffling ? { ...p, shuffling: false } : p),
      }));
    }, 500);
    return () => clearTimeout(timer);
  }, [state.players]);

  // AI auto-play: simultaneous during play phase, sequential during buy phase
  useEffect(() => {
    if (state.gameOver || pendingAbility || abilityQueueRef.current.length) return;
    if (state.phase === 'play') {
      const aiPlayer = state.players.find(p => p.type === 'ai' && getActiveHandIndex(p) >= 0 && !p.hands[getActiveHandIndex(p)]?.busy);
      if (!aiPlayer) return;
      aiTimeoutRef.current = schedule(() => {
        const s = stateRef.current;
        const p = s.players[aiPlayer.index];
        if (!p || p.type !== 'ai') return;
        const hIdx = getActiveHandIndex(p);
        if (hIdx < 0) return;
        const score = calcHandScore(p.hands[hIdx].cards);
        if (score < 16) handleHit(p.index);
        else handleStay(p.index);
      }, 700);
    } else if (state.phase === 'buy') {
      const p = state.players[state.currentPlayerIndex];
      if (!p || p.type !== 'ai') return;
      aiTimeoutRef.current = schedule(() => {
        const s = stateRef.current;
        const sp = s.players[s.currentPlayerIndex];
        if (!sp || sp.type !== 'ai') return;
        const affordable = s.shopDisplay
          .filter(c => cardCost(c.rank) <= sp.diamonds)
          .sort((a, b) => {
            const aH = a.suit === 'hearts'; const bH = b.suit === 'hearts';
            if (aH && !bH) return -1; if (bH && !aH) return 1;
            return cardCost(b.rank) - cardCost(a.rank);
          });
        if (affordable.length > 0) handleBuyCard(affordable[0]);
        else handleEndBuyTurn();
      }, 700);
    }
    return () => { if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current); };
  }, [state.players, state.phase, state.currentPlayerIndex, state.gameOver, pendingAbility]);

  function triggerFlash21(i) { setFlash21(p => ({ ...p, [i]: true })); schedule(() => setFlash21(p => ({ ...p, [i]: false })), 800); }
  function triggerFlashBust(i) { setFlashBust(p => ({ ...p, [i]: true })); schedule(() => setFlashBust(p => ({ ...p, [i]: false })), 800); }
  function triggerFlashCharlie(i) { setFlashCharlie(p => ({ ...p, [i]: true })); schedule(() => setFlashCharlie(p => ({ ...p, [i]: false })), 800); }

  // Build an ability object for a black card (spade burn / club scry).
  function buildAbility(card, playerIndex, handIdx) {
    if (card.suit === 'spades') {
      const { discardBurn } = getSpadeAbility(card.rank);
      return {
        type: 'burn',
        triggerCard: card,
        discardCards: stateRef.current.players[playerIndex].discard.slice(-Math.min(discardBurn * 3, stateRef.current.players[playerIndex].discard.length)),
        maxBurnDiscard: discardBurn,
        optional: true,
        playerIndex,
        handIndex: handIdx,
      };
    }
    const { deckScry } = getClubAbility(card.rank);
    const p = stateRef.current.players[playerIndex];
    let deckCards = [];
    if (p.deck.length > 0) deckCards = p.deck.slice(-Math.min(deckScry, p.deck.length)).reverse();
    return {
      type: 'scry',
      triggerCard: card,
      deckCards,
      maxBurnDiscard: 0,
      optional: true,
      playerIndex,
      handIndex: handIdx,
    };
  }

  // Queue black-card abilities from a freshly drawn set of cards (opening hand or redraw).
  // Abilities trigger once BOTH cards are drawn. Processes one at a time via the dialog.
  function queueAbilities(cards, playerIndex, handIdx) {
    const blackCards = cards.filter(c => c.suit === 'spades' || c.suit === 'clubs');
    if (blackCards.length === 0) return;
    const p = stateRef.current.players[playerIndex];
    for (const card of blackCards) {
      abilityQueueRef.current.push({ card, playerIndex, handIdx });
    }
  }

  function processAbilityQueue() {
    if (pendingAbilityRef.current) return;
    const next = abilityQueueRef.current.shift();
    if (!next) {
      // Queue drained — run pending opening/redraw 21 check
      const checks = openingCheckRef.current.splice(0);
      for (const check of checks) schedule(check, 50);
      return;
    }
    const { card, playerIndex, handIdx } = next;
    const player = stateRef.current.players[playerIndex];
    if (!player) { processAbilityQueue(); return; }
    // AI: auto-resolve — uses ability if beneficial
    if (player.type === 'ai') {
      setState(prev => {
        const n = { ...prev };
        const pl = { ...n.players[playerIndex] };
        n.players = [...n.players];
        n.players[playerIndex] = pl;
        if (card.suit === 'spades') {
          const { discardBurn } = getSpadeAbility(card.rank);
          for (let i = 0; i < discardBurn && pl.discard.length > 0; i++) { pl.discard.pop(); }
        } else {
          const { deckScry } = getClubAbility(card.rank);
          const h = pl.hands[handIdx];
          if (h) {
            for (let i = 0; i < deckScry && pl.deck.length > 0; i++) {
              const top = pl.deck[pl.deck.length - 1];
              const testScore = calcHandScore([...h.cards, top]);
              if (testScore > 21) { pl.deck.pop(); pl.discard.push(top); }
            }
          }
        }
        return n;
      });
      schedule(() => processAbilityQueue(), 50);
      return;
    }
    // Human: show dialog
    const ability = buildAbility(card, playerIndex, handIdx);
    pendingAbilityRef.current = ability;
    setPendingAbility(ability);
  }

  function startNewRound() {
    setState(prev => {
      const next = { ...prev, round: prev.round + 1, phase: 'play', log: [...prev.log, `--- Round ${prev.round + 1} ---`] };
      // Shop: 2 × player count, ALL new (old discarded)
      const shopCount = Math.min(2 * next.players.length, next.shopDeck.length);
      const newShop = [];
      const sDeck = [...next.shopDeck];
      for (let i = 0; i < shopCount; i++) newShop.push(sDeck.pop());
      next.shopDeck = sDeck;
      next.shopDisplay = newShop;
      next.log = [...next.log, `Shop: ${newShop.length} cards.`];
      // Draw 2 cards per player
      next.players = next.players.map((p) => {
        const newP = { ...p, hands: [{ cards: [], score: 0, stayed: false, busted: false, done: false, busy: true }], bonusDiamonds: 0, doneBuying: false, roundBoughtCards: [] };
        for (let i = 0; i < 2; i++) {
          const card = drawFromPlayerDeck(newP);
          if (card) newP.hands[0].cards.push(card);
        }
        newP.hands[0].score = calcHandScore(newP.hands[0].cards);
        next.log = [...next.log, `${newP.name} draws 2 (${newP.hands[0].score}).`];
        return newP;
      });
      return next;
    });
    // After both cards drawn, trigger black-card abilities (once both drawn), then check 21s
    schedule(() => {
      // 21 check runs when the ability queue drains (or immediately if no abilities)
      openingCheckRef.current.push(() => {
        setState(s => { s.players.forEach(p => p.hands.forEach(h => { h.busy = false; })); return s; });
        const s2 = stateRef.current;
        s2.players.forEach((p, i) => {
          const h = p.hands[0];
          if (h && calcHandScore(h.cards) === 21) {
            const isBJ = h.cards.length === 2 && h.cards.some(c => c.rank === 'A') && h.cards.some(c => ['10','J','Q','K'].includes(c.rank));
            apply21(i, 0, isBJ);
          }
        });
      });
      const s = stateRef.current;
      s.players.forEach((p, i) => {
        const h = p.hands[0];
        if (h && h.cards.length >= 2) queueAbilities(h.cards, i, 0);
      });
      processAbilityQueue();
    }, 300);
  }

  function apply21(playerIndex, handIdx, isBlackjack) {
    const hand = stateRef.current.players[playerIndex]?.hands[handIdx];
    if (!hand || hand.busy || hand.done) return;
    const bonus = isBlackjack ? 8 : 3;
    triggerFlash21(playerIndex);
    setState(prev => {
      const next = { ...prev };
      const player = { ...next.players[playerIndex] };
      next.players = [...next.players];
      next.players[playerIndex] = player;
      player.hands[handIdx].busy = true;
      player.diamonds = (player.diamonds || 0) + bonus;
      next.log = [...next.log, `${player.name} hits 21! ${isBlackjack ? 'BLACKJACK! ' : ''}+${bonus} chips!`];
      return next;
    });
    schedule(() => redrawHand(playerIndex, handIdx), 850);
  }

  function redrawHand(playerIndex, handIdx) {
    setState(prev => {
      const next = { ...prev };
      const player = { ...next.players[playerIndex] };
      next.players = [...next.players];
      next.players[playerIndex] = player;
      const hands = [...player.hands];
      const hand = hands[handIdx];
      if (!hand || !Array.isArray(hand.cards)) return next;
      const handCopy = { ...hand };
      hands[handIdx] = handCopy;
      player.hands = hands;
      player.discard = [...player.discard, ...handCopy.cards];
      handCopy.cards = [];
      for (let i = 0; i < 2; i++) {
        const nc = drawFromPlayerDeck(player);
        if (nc) handCopy.cards.push(nc);
      }
      handCopy.score = calcHandScore(handCopy.cards);
      handCopy.busy = true;
      handCopy.stayed = false; handCopy.busted = false; handCopy.done = false;
      next.log = [...next.log, `${player.name} redraws 2 (${handCopy.score}).`];
      return next;
    });
    // After both redrawn cards, trigger abilities (once both drawn), then check 21
    schedule(() => {
      openingCheckRef.current.push(() => {
        setState(s => { const h = s.players[playerIndex]?.hands[handIdx]; if (h) h.busy = false; return s; });
        const s2 = stateRef.current;
        const h2 = s2.players[playerIndex]?.hands[handIdx];
        if (h2 && calcHandScore(h2.cards) === 21) {
          const isBJ = h2.cards.length === 2 && h2.cards.some(c => c.rank === 'A') && h2.cards.some(c => ['10','J','Q','K'].includes(c.rank));
          apply21(playerIndex, handIdx, isBJ);
        }
      });
      const s = stateRef.current;
      const h = s.players[playerIndex]?.hands[handIdx];
      if (h && h.cards.length >= 2) queueAbilities(h.cards, playerIndex, handIdx);
      processAbilityQueue();
    }, 100);
  }

  function handleHit(playerIndex) {
    const current = stateRef.current, active = current.players[playerIndex];
    if(current.phase !== 'play' || pendingAbilityRef.current || abilityQueueRef.current.length || active?.hands[getActiveHandIndex(active)]?.busy) return;
    setState(prev => {
      const next = { ...prev };
      const player = { ...next.players[playerIndex] };
      next.players = [...next.players];
      next.players[playerIndex] = player;
      const handIdx = getActiveHandIndex(player);
      if (handIdx < 0) return prev;
      const hands = [...player.hands];
      const hand = { ...hands[handIdx] };
      hands[handIdx] = hand;
      player.hands = hands;

      const card = drawFromPlayerDeck(player);
      if (!card) {
        hand.done = true; hand.stayed = true;
        next.log = [...prev.log, `${player.name} has no cards left. Auto-stay.`];
        return checkAllDone(next) ? enterBuyPhase(next) : next;
      }

      hand.cards = [...hand.cards, card];
      hand.score = calcHandScore(hand.cards);
      next.log = [...prev.log, `${player.name} hits: ${SUIT_SYMBOLS[card.suit]}${card.rank} (${hand.score}).`];

      const isSpade = card.suit === 'spades';
      const isClub = card.suit === 'clubs';

      // Human: show ability dialog, defer bust check
      if ((isSpade || isClub) && player.type === 'human') {
        hand.busy = true;
        let ability;
        if (isSpade) {
          const { discardBurn, optional } = getSpadeAbility(card.rank);
          ability = {
            type: 'burn',
            triggerCard: card,
            discardCards: player.discard.slice(-Math.min(discardBurn * 3, player.discard.length)),
            mustBurnDiscard: 0,
            maxBurnDiscard: discardBurn,
            optional: true,
            fromHit: true,
            playerIndex,
            handIndex: handIdx,
          };
        } else {
          const { deckScry } = getClubAbility(card.rank);
          let deckCards = [];
          if (player.deck.length > 0) deckCards = player.deck.slice(-Math.min(deckScry, player.deck.length)).reverse();
          ability = {
            type: 'scry',
            triggerCard: card,
            deckCards,
            mustBurnDiscard: 0,
            optional: true,
            fromHit: true,
            playerIndex,
            handIndex: handIdx,
          };
        }
        schedule(() => { pendingAbilityRef.current = ability; setPendingAbility(ability); }, 50);
        return next;
      }

      // AI: auto-resolve abilities inline — uses if beneficial
      if (player.type === 'ai') {
        if (isSpade) {
          const { discardBurn } = getSpadeAbility(card.rank);
          for (let i = 0; i < discardBurn && player.discard.length > 0; i++) { player.discard.pop(); }
        }
        if (isClub) {
          const { deckScry } = getClubAbility(card.rank);
          for (let i = 0; i < deckScry && player.deck.length > 0; i++) {
            const top = player.deck[player.deck.length - 1];
            const testScore = calcHandScore([...hand.cards, top]);
            if (testScore > 21) { player.deck.pop(); player.discard.push(top); }
          }
        }
      }

      return checkPostHit(next, playerIndex);
    });
  }

  function checkPostHit(prev, playerIndex) {
    const next = { ...prev };
    const player = { ...next.players[playerIndex] };
    next.players = [...next.players];
    next.players[playerIndex] = player;
    const handIdx = getActiveHandIndex(player);
    if (handIdx < 0) return next;
    const hands = [...player.hands];
    const hand = { ...hands[handIdx] };
    hands[handIdx] = hand;
    player.hands = hands;
    hand.busy = false;
    hand.score = calcHandScore(hand.cards);

    // Charlie: 5 cards without busting
    if (hand.cards.length >= 5 && hand.score <= 21) {
      hand.busy = true;
      triggerFlashCharlie(playerIndex);
      player.diamonds = (player.diamonds || 0) + 3;
      next.log = [...next.log, `${player.name} CHARLIE! +3 chips!`];
      schedule(() => redrawHand(playerIndex, handIdx), 850);
      return next;
    }

    // Bust
    if (hand.score > 21) {
      hand.busy = true; hand.busted = true; hand.done = true;
      next.log = [...next.log, `${player.name} busts!`];
      triggerFlashBust(playerIndex);
      schedule(() => {
        setState(prev2 => {
          const n2 = { ...prev2 };
          const p2 = { ...n2.players[playerIndex] };
          n2.players = [...n2.players];
          n2.players[playerIndex] = p2;
          const hs = [...p2.hands];
          const h2 = hs[handIdx];
          if (!h2 || !Array.isArray(h2.cards)) return n2;
          const h2c = { ...h2 };
          hs[handIdx] = h2c;
          p2.hands = hs;
          // Clubs don't survive — all discarded
          p2.discard = [...p2.discard, ...h2c.cards];
          h2c.busy = false;
          h2c.cards = [];
          h2c.score = 0;
          return checkAllDone(n2) ? enterBuyPhase(n2) : n2;
        });
      }, 850);
      return next;
    }

    // 21
    if (hand.score === 21) {
      const isBlackjack = hand.cards.length === 2 && hand.cards.some(c => c.rank === 'A') && hand.cards.some(c => ['10','J','Q','K'].includes(c.rank));
      const bonus = isBlackjack ? 8 : 3;
      hand.busy = true;
      triggerFlash21(playerIndex);
      player.hands[handIdx].busy = true;
      player.diamonds = (player.diamonds || 0) + bonus;
      next.log = [...next.log, `${player.name} hits 21! ${isBlackjack ? 'BLACKJACK! ' : ''}+${bonus} chips!`];
      schedule(() => redrawHand(playerIndex, handIdx), 850);
      return next;
    }

    return next;
  }

  function handleAbilityResolved(selectedIds) {
    const ability = pendingAbility;
    pendingAbilityRef.current = null;
    setPendingAbility(null);
    if (!ability) return;
    setState(prev => {
      const next = { ...prev };
      const player = { ...next.players[ability.playerIndex] };
      next.players = [...next.players];
      next.players[ability.playerIndex] = player;
      if (ability.type === 'scry') {
        const toDiscard = (ability.deckCards || []).filter(c => selectedIds.includes(c.id));
        player.deck = player.deck.filter(c => !toDiscard.some(d => d.id === c.id));
        player.discard = [...player.discard, ...toDiscard];
        if (toDiscard.length) next.log = [...next.log, `${player.name} scrys and discards ${toDiscard.length} card(s).`];
      } else if (ability.type === 'burn') {
        const toBurn = (ability.discardCards || []).filter(c => selectedIds.includes(c.id));
        player.discard = player.discard.filter(c => !toBurn.some(b => b.id === c.id));
        if (toBurn.length) next.log = [...next.log, `${player.name} burns ${toBurn.length} card(s).`];
      }
      return next;
    });
    // Continue queued abilities (opening hand / redraw), then hit-resolution if from a hit
    schedule(() => {
      processAbilityQueue();
      if (ability.fromHit) setState(prev => checkPostHit(prev, ability.playerIndex));
    }, 50);
  }

  function handleStay(playerIndex) {
    const current = stateRef.current, active = current.players[playerIndex];
    if(current.phase !== 'play' || pendingAbilityRef.current || abilityQueueRef.current.length || active?.hands[getActiveHandIndex(active)]?.busy) return;
    setState(prev => {
      const next = { ...prev };
      const player = { ...next.players[playerIndex] };
      next.players = [...next.players];
      next.players[playerIndex] = player;
      const handIdx = getActiveHandIndex(player);
      if (handIdx < 0) return prev;
      const hands = [...player.hands];
      const hand = { ...hands[handIdx] };
      hands[handIdx] = hand;
      player.hands = hands;
      hand.stayed = true; hand.done = true;
      next.log = [...prev.log, `${player.name} stays (${hand.score}).`];
      return checkAllDone(next) ? enterBuyPhase(next) : next;
    });
  }

  function checkAllDone(s) {
    return s.players.every(p => p.hands.every(h => h.done && !h.busy));
  }

  function enterBuyPhase(s) {
    s.players = s.players.map(p => {
      let earned = p.bonusDiamonds || 0;
      for (const h of p.hands) earned += calcHandDiamonds(h);
      for (const h of p.hands) p.discard.push(...h.cards);
      return { ...p, diamonds: p.diamonds + earned, bonusDiamonds: 0, hands: [], doneBuying: false, roundBoughtCards: [] };
    });
    s.log = [...s.log, `--- Buy Phase ---`];
    s.players.forEach(p => { s.log = [...s.log, `${p.name}: ${p.diamonds} chips`]; });
    const buyOrder = getBuyOrder(s.players);
    s.turnOrder = buyOrder;
    s.buyRoundIndex = 0;
    s.currentPlayerIndex = buyOrder[0];
    s.phase = 'buy';
    return s;
  }

  function endGame(s) {
    s.players = s.players.map(p => ({ ...p, totalHeartValue: countHeartValue(p) }));
    const maxHearts = Math.max(...s.players.map(p => p.totalHeartValue));
    const winners = s.players.filter(p => p.totalHeartValue === maxHearts);
    s.winner = winners.length === 1 ? winners[0] : winners;
    s.gameOver = true;
    s.phase = 'gameOver';
    s.log = [...s.log, `=== GAME OVER ===`];
    return s;
  }

  function advanceBuySlot(prev) {
    const next = { ...prev };
    const order = next.turnOrder;
    let slot = (next.buyRoundIndex ?? 0) + 1;
    while (slot < order.length && next.players[order[slot]]?.doneBuying) slot++;
    if (slot >= order.length) {
      const canBuy = next.players.some(p => !p.doneBuying && next.shopDisplay.some(c => cardCost(c.rank) <= p.diamonds));
      if (!canBuy) {
        next.log = [...next.log, `Buy phase complete.`];
        if (next.shopDeck.length === 0) return endGame(next);
        next.phase = 'dealing';
        schedule(() => startNewRound(), 500);
        return next;
      }
      slot = 0;
      while (slot < order.length && next.players[order[slot]]?.doneBuying) slot++;
      if (slot >= order.length) {
        next.log = [...next.log, `Buy phase complete.`];
        if (next.shopDeck.length === 0) return endGame(next);
        next.phase = 'dealing';
        schedule(() => startNewRound(), 500);
        return next;
      }
    }
    next.buyRoundIndex = slot;
    next.currentPlayerIndex = order[slot];
    next.log = [...next.log, `${next.players[order[slot]].name}'s turn to buy.`];
    return next;
  }

  function handleBuyCard(card) {
    if (stateRef.current.phase !== 'buy' || !stateRef.current.shopDisplay.some(c => c.id === card.id)) return;
    setState(prev => {
      const next = { ...prev };
      const player = { ...next.players[next.currentPlayerIndex] };
      next.players = [...next.players];
      next.players[next.currentPlayerIndex] = player;
      const cost = cardCost(card.rank);
      if (player.diamonds < cost) return prev;
      player.diamonds -= cost;
      player.discard = [...player.discard, card];
      player.roundBoughtCards = [...(player.roundBoughtCards || []), card];
      next.shopDisplay = next.shopDisplay.filter(c => c.id !== card.id);
      next.log = [...prev.log, `${player.name} buys ${SUIT_SYMBOLS[card.suit]}${card.rank} for ${cost} chips.`];
      return advanceBuySlot(next);
    });
  }

  function handleEndBuyTurn() {
    if (stateRef.current.phase !== 'buy') return;
    setState(prev => {
      const next = { ...prev };
      const player = { ...next.players[next.currentPlayerIndex], doneBuying: true };
      next.players = [...next.players];
      next.players[next.currentPlayerIndex] = player;
      next.log = [...prev.log, `${player.name} passes.`];
      return advanceBuySlot(next);
    });
  }

  const currentPlayer = state.players[state.currentPlayerIndex];
  const isBuyHumanTurn = state.phase === 'buy' && currentPlayer?.type === 'human';

  if (state.gameOver) {
    return <GameOverScreen players={state.players} onRestart={() => onRestart(state.players)} />;
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] sm:min-h-[calc(100vh-6rem)] casino-felt p-3 md:p-6 font-body text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-casino font-black text-primary tracking-widest drop-shadow-lg" style={{textShadow:'0 0 12px rgba(220,38,38,0.7)'}}>Red Queen</h1>
          <p className="text-xs text-white/60 font-casino tracking-wide">ROUND {state.round}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-3 py-1 rounded-full font-casino tracking-wider font-semibold border ${
            state.phase === 'play' ? 'bg-transparent border-white/40 text-white' :
            state.phase === 'buy' ? 'bg-transparent border-primary/60 text-primary' : 'bg-transparent border-white/20 text-white/50'
          }`}>
            {state.phase === 'play' ? 'PLAY' : state.phase === 'buy' ? 'BUY' : state.phase.toUpperCase()}
          </span>
          <Button variant="ghost" size="icon" onClick={() => setShowRules(true)} aria-label="Game rules" className="text-white/60 hover:text-white">
            <HelpCircle className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onRestart(null)} aria-label="Restart game" className="text-white/60 hover:text-white">
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {state.phase === 'play' && (
        <div className="text-center mb-3">
          <span className="text-sm text-primary font-casino tracking-wider font-semibold" style={{textShadow:'0 0 8px rgba(220,38,38,0.5)'}}>
            ALL PLAYERS — HIT OR STAY
          </span>
        </div>
      )}
      {state.phase === 'buy' && currentPlayer && (
        <div className="text-center mb-3">
          <span className="text-sm text-primary font-casino tracking-wider font-semibold" style={{textShadow:'0 0 8px rgba(220,38,38,0.5)'}}>
            {currentPlayer.name.toUpperCase()}'S TURN TO BUY
          </span>
        </div>
      )}

      {/* Player Hands */}
      <div className={`grid gap-3 mb-4 ${
        state.players.length <= 2 ? 'grid-cols-1 md:grid-cols-2' :
        state.players.length === 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-2 md:grid-cols-4'
      }`}>
        {state.players.map((player, i) => {
          const isActivePlay = state.phase === 'play' && player.type === 'human' && !pendingAbility && getActiveHandIndex(player) >= 0 && !player.hands[getActiveHandIndex(player)]?.busy;
          const isActiveBuy = state.phase === 'buy' && state.currentPlayerIndex === i;
          const hIdx = getActiveHandIndex(player);
          const bustPct = isActivePlay && hIdx >= 0 ? calcBustProbability(player, player.hands[hIdx]?.cards || []) : null;
          return (
            <div key={i} className="relative">
              <AnimatePresence>
                {flash21[i] && (
                  <motion.div initial={{opacity:0,scale:0.5}} animate={{opacity:1,scale:1.15}} exit={{opacity:0,scale:1.5}} transition={{duration:0.25}}
                    className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                    <span className="font-casino text-6xl font-black text-yellow-300 drop-shadow-[0_0_16px_rgba(255,220,50,0.9)]">21</span>
                  </motion.div>
                )}
                {flashBust[i] && (
                  <motion.div initial={{opacity:0,scale:0.5}} animate={{opacity:1,scale:1.15}} exit={{opacity:0,scale:1.5}} transition={{duration:0.25}}
                    className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                    <span className="font-casino text-6xl font-black text-red-400 drop-shadow-[0_0_16px_rgba(220,50,50,0.9)]">BUST</span>
                  </motion.div>
                )}
                {flashCharlie[i] && (
                  <motion.div initial={{opacity:0,scale:0.5}} animate={{opacity:1,scale:1.15}} exit={{opacity:0,scale:1.5}} transition={{duration:0.25}}
                    className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                    <span className="font-casino text-5xl font-black text-green-300 drop-shadow-[0_0_16px_rgba(50,220,100,0.9)]">CHARLIE!</span>
                  </motion.div>
                )}
              </AnimatePresence>
              {player.hands.length > 0 ? player.hands.map((_, hI) => (
                <PlayerHandDisplay key={hI} player={player} handIndex={hI}
                  isActive={isActivePlay || isActiveBuy}
                  phase={state.phase} isSecondHand={hI > 0} />
              )) : (
                <PlayerHandDisplay player={player} handIndex={0}
                  isActive={isActivePlay || isActiveBuy}
                  phase={state.phase} />
              )}
              {/* Per-player Hit/Stay for simultaneous play */}
              {isActivePlay && (
                <motion.div initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} className="flex gap-2 justify-center mt-2">
                  <Button onClick={() => handleHit(i)} size="sm"
                    className="bg-transparent hover:bg-white/10 text-white font-casino tracking-wider border border-white/50 h-8 px-4 flex items-center gap-1">
                    <Hand className="w-3 h-3" /> HIT
                    {bustPct !== null && <span className={`text-[9px] ${bustPct>=50?'text-red-200':'text-green-100'}`}>{bustPct}%</span>}
                  </Button>
                  <Button onClick={() => handleStay(i)} size="sm" variant="outline"
                    className="font-casino tracking-wider border-white/40 bg-transparent text-white hover:bg-white/10 h-8 px-4">
                    <Square className="w-3 h-3 mr-1" /> STAY
                  </Button>
                </motion.div>
              )}
            </div>
          );
        })}
      </div>

      {/* Buy phase done button */}
      {isBuyHumanTurn && (
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="flex justify-center mb-4">
          <Button onClick={handleEndBuyTurn} variant="outline"
            className="font-casino tracking-widest border-white/40 bg-transparent text-white hover:bg-white/10">
            <ArrowRight className="w-4 h-4 mr-2" /> DONE BUYING
          </Button>
        </motion.div>
      )}

      {/* Shop */}
      <ShopDisplay shopCards={state.shopDisplay} shopDeckCount={state.shopDeck.length}
        onBuyCard={handleBuyCard} canBuy={isBuyHumanTurn}
        playerDiamonds={currentPlayer?.diamonds || 0} />

      {/* Game Log */}
      <div className="mt-4">
        <GameLog log={state.log} />
      </div>

      <AbilityChoiceDialog key={pendingAbility?.triggerCard?.id || 'none'} pendingAbility={pendingAbility} open={!!pendingAbility} onResolve={handleAbilityResolved} />
      <RulesModal open={showRules} onClose={() => setShowRules(false)} />
    </div>
  );
}