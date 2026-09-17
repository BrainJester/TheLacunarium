import React, { useState } from 'react';
import { motion } from 'framer-motion';
import PlayingCard from './PlayingCard';
import DeckPopup from './DeckPopup';
import { calcHandScore, SUIT_SYMBOLS, rankDisplayValue, getCardSuits } from '@/lib/redQueenEngine';

const SUIT_COLOR_CLASS = {
  hearts: 'text-red-400',
  diamonds: 'text-red-400',
  clubs: 'text-white',
  spades: 'text-white',
};

function MiniCard({ card }) {
  return (
    <span className={`text-[10px] font-bold font-casino ${SUIT_COLOR_CLASS[card.suit]}`}>
      {card.rank}{SUIT_SYMBOLS[card.suit]}
    </span>
  );
}

function heartCount(player) {
  let total = 0;
  const handCards = (player.hands || []).flatMap(h => h.cards);
  for (const c of [...player.deck, ...handCards, ...player.discard]) {
    if (getCardSuits(c).includes('hearts')) total += rankDisplayValue(c.rank);
  }
  return total;
}

export default function PlayerHandDisplay({ player, isActive, handIndex = 0, phase, isSecondHand = false }) {
  const [showDeck, setShowDeck] = useState(false);

  const isBuyPhase = phase === 'buy';
  const hand = player.hands[handIndex];

  const handCards = (player.hands || []).flatMap(h => h.cards);
  const totalCards = handCards.length + player.deck.length + player.discard.length;

  const score = hand ? calcHandScore(hand.cards) : 0;
  const busted = score > 21;

  // Hearts in deck+discard
  const hearts = heartCount(player);

  // All cards player currently holds (across all hands) for buy phase mini display
  const allHandCards = (player.hands || []).flatMap(h => h.cards);

  return (
    <>
      <div className={`
        rounded-xl p-3 transition-all duration-300 border
        ${isActive
          ? 'bg-transparent border-white/80 ring-2 ring-white/40'
          : 'bg-transparent border-white/30'}
      `}>
        {/* Header row — hidden for secondary spade-split hands */}
        {!isSecondHand && (
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-casino font-bold text-white tracking-wide truncate max-w-[100px]">
                {player.name}
              </span>
              {/* Hearts count */}
              {hearts > 0 && (
                <span className="text-xs text-red-400 font-bold font-casino">
                  ♥{hearts}
                </span>
              )}
              {/* Mini hand cards in buy phase */}
              {isBuyPhase && allHandCards.length > 0 && (
                <span className="flex items-center gap-0.5">
                  {allHandCards.map(c => <MiniCard key={c.id} card={c} />)}
                </span>
              )}
              {/* Total card count button */}
              <button
                onClick={() => setShowDeck(true)}
                className="text-xs bg-white/10 hover:bg-white/20 text-white/60 hover:text-white px-2 py-0.5 rounded font-semibold transition-colors border border-white/20"
                title="View all cards"
              >
                {totalCards}🂠
              </button>
              {player.shuffling && (
                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded font-semibold animate-pulse">
                  Shuffling
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="chips-badge" title="Chips" style={{width:'2rem', height:'2rem', fontSize:'1.7rem'}}>
                {player.diamonds + (player.bonusDiamonds || 0)}
              </span>
              {!isBuyPhase && hand && (
                <motion.span
                  key={score}
                  initial={{ scale: 1.3 }}
                  animate={{ scale: 1 }}
                  className={`
                    text-base font-bold font-casino px-2 py-0.5 rounded-md border
                    ${busted
                      ? 'bg-transparent border-red-500/60 text-red-400'
                      : score === 21
                      ? 'bg-transparent border-white/60 text-white'
                      : 'bg-transparent border-white/30 text-white'}
                  `}
                >
                  {score}
                </motion.span>
              )}
            </div>
          </div>
        )}
        {/* Score display for secondary hands */}
        {isSecondHand && !isBuyPhase && hand && (
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/50 font-casino">Hand 2</span>
            <motion.span
              key={score}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              className={`
                text-base font-bold font-casino px-2 py-0.5 rounded-md border
                ${busted
                  ? 'bg-transparent border-red-500/60 text-red-400'
                  : score === 21
                  ? 'bg-transparent border-white/60 text-white'
                  : 'bg-transparent border-white/30 text-white'}
              `}
            >
              {score}
            </motion.span>
          </div>
        )}

        {/* Buy phase view */}
        {isBuyPhase ? (
          <div>
            {player.doneBuying ? (
              <div className="text-sm text-white/40 italic">Done buying</div>
            ) : isActive ? (
              <div className="text-sm text-primary font-casino font-semibold tracking-wider">SHOPPING...</div>
            ) : (
              <div className="text-sm text-white/40 italic">Waiting...</div>
            )}
            {player.roundBoughtCards && player.roundBoughtCards.length > 0 && (
              <div className="mt-2">
                <div className="text-xs text-white/40 mb-1 font-casino tracking-wider">BOUGHT:</div>
                <div className="flex flex-wrap gap-1">
                  {player.roundBoughtCards.map(card => (
                    <PlayingCard key={card.id} card={card} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {hand ? (
              <>
                <div className="flex flex-wrap gap-1">
                  {hand.cards.map((card) => (
                    <PlayingCard key={card.id} card={card} />
                  ))}
                  {hand.cards.length === 0 && (
                    <div className="text-sm text-white/40 italic">No cards</div>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  {hand.stayed && (
                    <span className="text-xs border border-white/30 text-white/60 px-2 py-0.5 rounded font-casino tracking-wider">STAYED</span>
                  )}
                  {hand.busted && (
                    <span className="text-xs border border-red-500/50 text-red-400 px-2 py-0.5 rounded font-casino tracking-wider">BUST</span>
                  )}
                </div>
              </>
            ) : (
              <div className="text-sm text-white/40 italic">Waiting...</div>
            )}
          </>
        )}
      </div>

      <DeckPopup
        player={player}
        open={showDeck}
        onClose={() => setShowDeck(false)}
      />
    </>
  );
}