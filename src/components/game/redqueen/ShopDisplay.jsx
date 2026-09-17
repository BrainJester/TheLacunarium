import React from 'react';
import PlayingCard from './PlayingCard';
import { cardCost } from '@/lib/redQueenEngine';
import { motion } from 'framer-motion';
import { ShoppingBag } from 'lucide-react';

export default function ShopDisplay({ shopCards, shopDeckCount, onBuyCard, canBuy, playerDiamonds }) {
  return (
    <div className="bg-transparent border border-white/30 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-primary" />
          <h3 className="font-casino font-semibold text-sm tracking-wider text-white">SHOP</h3>
        </div>
        <span className="text-xs text-white/50 font-body">
          {shopDeckCount} cards left in deck
        </span>
      </div>

      {shopCards.length === 0 ? (
        <div className="text-center text-white/40 text-sm py-6">Shop is empty</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {shopCards.map((card) => {
            const cost = cardCost(card.rank);
            const affordable = canBuy && playerDiamonds >= cost;
            return (
              <motion.div
                key={card.id}
                className="flex flex-col items-center gap-1"
                whileHover={affordable ? { scale: 1.05 } : {}}
              >
                <PlayingCard
                  card={card}
                  onClick={affordable ? () => onBuyCard(card) : undefined}
                  className={!affordable && canBuy ? 'opacity-40' : ''}
                />
                <span className={`text-[10px] font-casino font-bold flex items-center gap-0.5 ${affordable ? 'text-amber-400' : 'text-muted-foreground'}`}>
                  {cost}¢
                </span>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}