import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import PlayingCard from './PlayingCard';

// pendingAbility: {
//   type: 'scry' | 'burn',
//   triggerCard: card,
//   deckCards: [card, ...],    // scry: top cards peeked from deck
//   discardCards: [card, ...], // burn: cards from discard
//   mustBurnDiscard: number,   // mandatory burn count (0 if optional)
//   maxBurnDiscard: number,    // max burn count
//   optional: boolean,
//   playerIndex, handIndex,
// }

export default function AbilityChoiceDialog({ pendingAbility, open, onResolve }) {
  const [selected, setSelected] = useState([]);

  if (!pendingAbility) return null;

  const { type, deckCards = [], discardCards = [], maxBurnDiscard = 0, optional = true } = pendingAbility;

  function toggleSelect(id) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function handleConfirm() {
    setSelected([]);
    onResolve(selected);
  }

  // --- SCRY (deck only) ---
  if (type === 'scry') {
    const isEmpty = deckCards.length === 0;
    return (
      <AlertDialog open={open}>
        <AlertDialogContent className="bg-card border-border max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-center">♣ Scry</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-muted-foreground text-sm">
              {isEmpty ? 'Nothing to scry — no cards available.' : 'Select cards to DISCARD, or keep all.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {!isEmpty && (
            <div className="mt-2">
              <p className="text-xs text-white/50 font-casino text-center mb-2">FROM DECK (top first)</p>
              <div className="flex flex-wrap justify-center gap-2">
                {deckCards.map(c => (
                  <div key={c.id} className="flex flex-col items-center gap-1">
                    <PlayingCard card={c} selected={selected.includes(c.id)} onClick={() => toggleSelect(c.id)} />
                    <span className="text-[10px] text-white/50">{selected.includes(c.id) ? 'DISCARD' : 'KEEP'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <Button className="flex-1 bg-primary text-primary-foreground" onClick={handleConfirm}>
              {isEmpty ? 'OK' : selected.length > 0 ? `Discard ${selected.length}` : 'Keep All'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // --- BURN (discard only) ---
  if (type === 'burn') {
    const isEmpty = discardCards.length === 0;
    const selectedCount = selected.length;
    const atMax = maxBurnDiscard > 0 && selectedCount >= maxBurnDiscard;

    return (
      <AlertDialog open={open}>
        <AlertDialogContent className="bg-card border-border max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-center">♠ Burn</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-muted-foreground text-sm">
              {isEmpty
                ? 'Nothing to burn.'
                : `Select up to ${maxBurnDiscard} card(s) to burn, or skip.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {!isEmpty && (
            <div className="mt-2">
              <p className="text-xs text-white/50 font-casino text-center mb-2">FROM DISCARD</p>
              <div className="flex flex-wrap justify-center gap-2">
                {discardCards.map(c => (
                  <div key={c.id} className="flex flex-col items-center gap-1">
                    <PlayingCard
                      card={c}
                      selected={selected.includes(c.id)}
                      onClick={atMax && !selected.includes(c.id) ? undefined : () => toggleSelect(c.id)}
                      className={atMax && !selected.includes(c.id) ? 'opacity-40' : ''}
                    />
                    <span className="text-[10px] text-red-400">{selected.includes(c.id) ? '🔥 BURN' : 'keep'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <Button className="flex-1 bg-primary text-primary-foreground" onClick={handleConfirm}>
              {isEmpty ? 'OK' : selectedCount > 0 ? `Burn ${selectedCount}` : 'Skip'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return null;
}