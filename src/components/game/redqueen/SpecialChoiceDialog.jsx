import React from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import PlayingCard from './PlayingCard';

/**
 * type: 'pair_split' | 'double_down'
 * For pair_split: cards = [card1, card2]
 * For double_down: cards = currentHandCards, wager = chips wagered
 */
export default function SpecialChoiceDialog({ open, type, cards = [], wager = 0, onChoice }) {
  if (!open) return null;

  if (type === 'pair_split') {
    return (
      <AlertDialog open={open}>
        <AlertDialogContent className="bg-[hsl(150,45%,18%)] border border-white/40 text-white max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-casino tracking-widest text-white text-xl">PAIR!</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70 font-body">
              You were dealt a pair. Split into two separate hands?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-center gap-3 py-3">
            {cards.map((card, i) => <PlayingCard key={i} card={card} />)}
          </div>
          <AlertDialogFooter className="gap-2">
            <Button
              variant="outline"
              className="border-white/40 bg-transparent text-white hover:bg-white/10 font-casino tracking-widest flex-1"
              onClick={() => onChoice('keep')}
            >
              KEEP
            </Button>
            <Button
              className="bg-primary hover:bg-primary/80 text-white font-casino tracking-widest flex-1"
              onClick={() => onChoice('split')}
            >
              SPLIT
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  if (type === 'double_down') {
    return (
      <AlertDialog open={open}>
        <AlertDialogContent className="bg-[hsl(150,45%,18%)] border border-white/40 text-white max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-casino tracking-widest text-white text-xl">DOUBLE DOWN?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70 font-body">
              You have 11! Wager all <span className="text-amber-400 font-bold">{wager}</span> chips.
              <br />Draw one card — if it's a 10-value card, you double your wager. Otherwise you lose it and continue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-center gap-3 py-3">
            {cards.map((card, i) => <PlayingCard key={i} card={card} />)}
          </div>
          <AlertDialogFooter className="gap-2">
            <Button
              variant="outline"
              className="border-white/40 bg-transparent text-white hover:bg-white/10 font-casino tracking-widest flex-1"
              onClick={() => onChoice('pass')}
            >
              PASS
            </Button>
            <Button
              className="bg-primary hover:bg-primary/80 text-white font-casino tracking-widest flex-1"
              onClick={() => onChoice('double')}
            >
              DOUBLE DOWN
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return null;
}