import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PlayingCard from './PlayingCard';

function CardSection({ title, cards, color }) {
  if (cards.length === 0) return null;
  return (
    <div className="mb-4">
      <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${color}`}>{title} ({cards.length})</h3>
      <div className="flex flex-wrap gap-1.5">
        {cards.map(card => (
          <PlayingCard key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
}

export default function DeckPopup({ player, open, onClose }) {
  if (!player) return null;

  const handCards = (player.hands || []).flatMap(h => h.cards);
  const total = handCards.length + player.deck.length + player.discard.length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            {player.name}'s Cards
            <span className="text-sm font-normal text-muted-foreground">({total} total)</span>
          </DialogTitle>
        </DialogHeader>
        <div className="mt-2">
          <CardSection title="In Hand" cards={handCards} color="text-green-400" />
          <CardSection title="Deck" cards={player.deck} color="text-blue-400" />
          <CardSection title="Discard" cards={player.discard} color="text-muted-foreground" />
          {total === 0 && (
            <p className="text-muted-foreground text-sm italic">No cards.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}