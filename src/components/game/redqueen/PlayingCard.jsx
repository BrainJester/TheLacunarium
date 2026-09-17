import React from 'react';
import { motion } from 'framer-motion';
import { SUIT_SYMBOLS, rankDisplayValue } from '@/lib/redQueenEngine';

const suitColorMap = {
  hearts: 'text-red-500',
  diamonds: 'text-red-500',
  clubs: 'text-gray-800',
  spades: 'text-gray-800',
};

// Returns the effect text lines for a card
function getCardTexts(card) {
  const vp = rankDisplayValue(card.rank);

  const lines = [];
  if (card.suit === 'hearts') {
    lines.push({ text: `${vp}VP`, color: 'text-red-400' });
  } else if (card.suit === 'diamonds') {
    lines.push({ text: `${vp} chips`, color: 'text-yellow-600' });
  } else if (card.suit === 'spades') {
    const burnDesc = {
      J: 'Burn ≤1',
      Q: 'Burn ≤2',
      K: 'Burn ≤2',
      A: 'Burn ≤3',
    };
    lines.push({ text: burnDesc[card.rank] || 'Burn ≤1', color: 'text-gray-700' });
  } else if (card.suit === 'clubs') {
    const scryDesc = {
      J: 'Scry ≤1',
      Q: 'Scry ≤2',
      K: 'Scry ≤2',
      A: 'Scry ≤3',
    };
    lines.push({ text: scryDesc[card.rank] || 'Scry ≤1', color: 'text-gray-600' });
  }

  return lines;
}

export default function PlayingCard({ card, onClick, selected = false, className = '' }) {
  if (!card) return null;

  const symbol = SUIT_SYMBOLS[card.suit];
  const color = suitColorMap[card.suit];
  const texts = getCardTexts(card);

  return (
    <motion.div
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      exit={{ scaleX: 0 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      onClick={onClick}
      className={`
        w-[4.5rem] h-[4.5rem] md:w-24 md:h-36 text-sm md:text-base
        bg-white rounded-xl shadow-xl border-2 flex flex-col justify-between p-1.5 md:p-2 select-none
        transition-all duration-200 relative overflow-hidden
        ${selected ? 'border-primary ring-2 ring-primary/40 -translate-y-3' : 'border-gray-200'}
        ${onClick ? 'cursor-pointer hover:shadow-2xl hover:-translate-y-1' : ''}
        ${className}
      `}
    >
      {/* Top rank + suit */}
      <div className={`font-bold ${color} text-2xl md:text-3xl leading-none`}>
        {card.rank}
        <span className="ml-0.5">{symbol}</span>
      </div>

      {/* Center: effect texts */}
      <div className="flex flex-col items-center justify-center gap-0.5 flex-1 px-0.5">
        {texts.map((t, i) => (
          <span
            key={i}
            className={`text-[14px] md:text-[17px] font-semibold leading-tight text-center ${t.color}`}
          >
            {t.text}
          </span>
        ))}
      </div>

      {/* Bottom rank + suit (rotated) — hidden on mobile for square layout */}
      <div className={`hidden md:block font-bold ${color} text-2xl md:text-3xl leading-none self-end rotate-180`}>
        {card.rank}
        <span className="ml-0.5">{symbol}</span>
      </div>
    </motion.div>
  );
}