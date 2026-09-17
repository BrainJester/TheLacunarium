import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

const RULES_TEXT = `HOW TO PLAY — Red Queen

GOAL
• Collect the highest total Heart card value across all cards you own at the end of the game.
• Hearts in your deck and discard pile both count.

YOUR DECK
• Every player starts with a personal deck of 13 Diamond cards (2 through Ace).
• Your deck is private — you draw from it each round for your hand.
• When your deck is empty and you need to draw, your discard pile is shuffled back into your deck.
• Cards you buy during the Buy Phase are added to your discard pile and will eventually cycle back in.

ROUND STRUCTURE
• Players take turns simultaneously — everyone plays their hand at the same time.
• Draw: Each player draws 2 cards from their own deck to form their starting hand.
• Play Phase: All players Hit or Stay at the same time. Hit to draw a card, Stay to lock in your score.
• Buy Phase: Players take turns buying one card at a time (lowest chips goes first). Keep buying until you pass or can't afford anything.

HIT ORDER
• 1. Draw a card.
• 2. Resolve all abilities (even if the card causes a bust — abilities ALWAYS trigger first).
• 3. Check for bust / Charlie / 21.

ABILITIES
• Black card abilities (Spades Burn, Clubs Scry) trigger when drawn — including opening hands and redraws (after BOTH cards are drawn).
• All abilities are optional — you may skip any ability.

EARNING CHIPS
• When you don't bust: chips earned = hand score − 10 (minimum 0).
• Clubs earn chip value as normal (no special bust survival).
• Blackjack (Ace + face card/10 as opening 2 cards): +8 bonus chips, then hand discarded and redraw 2.
• Hitting (non-Blackjack) 21 at any point: +3 bonus chips, then hand discarded and redraw 2.
• Five Card Charlie (5 cards without busting): +3 bonus chips, then hand discarded and redraw 2.

CARD VALUES (for VP/chips or purchase cost)
• 2–10: face value. J=11, Q=12, K=13, A=14 (but A counts as 1 or 11 as normal for scoring to avoid bust).

♠ SPADES — BURN
• When drawn, permanently remove (burn) cards from your discard. Always optional.
• Base (2–10): Burn up to 1 from your discard.
• J: Burn up to 1 from your discard.
• Q: Burn up to 2 from your discard.
• K: Burn up to 2 from your discard.
• A: Burn up to 3 from your discard.

♣ CLUBS — SCRY
• When drawn, peek at the top card(s) of your deck and optionally discard them. Always optional.
• Base (2–10): Scry up to 1 from deck.
• J: Scry up to 1 from deck.
• Q: Scry up to 2 from deck.
• K: Scry up to 2 from deck.
• A: Scry up to 3 from deck.

♥ HEARTS
• Provide Victory Points equal to their face value (J=11, Q=12, K=13, A=14).
• Collect as many high-value hearts as possible to win!

♦ DIAMONDS
• Form your starting deck. All cards in your hand count toward your hand score, and chips earned = hand score − 10 (see Earning Chips).
• Your entire starting deck is diamonds.

SHOP
• The Shop displays face-up cards equal to 2 × the player count.
• Between rounds, ALL shop cards are discarded and replaced with fresh cards.
• Heart cards in the shop do NOT persist round to round.

END OF GAME
• The game ends at the end of the round in which the shop deck runs out of cards.
• All players' Heart cards (deck + discard) are totalled.
• The player with the highest Heart value wins!

VIEWING CARDS
• Click the card count badge next to any player's name to see their full hand, deck, and discard pile.`;


const Section = ({ title, children }) => (
  <div className="mb-5">
    <h3 className="text-primary font-display font-bold text-base mb-2 border-b border-border pb-1">{title}</h3>
    <div className="text-sm text-foreground/85 space-y-1.5 leading-relaxed">{children}</div>
  </div>
);

const Rule = ({ children }) => (
  <p className="flex gap-2"><span className="text-primary mt-0.5">▸</span><span>{children}</span></p>
);

export default function RulesModal({ open, onClose }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(RULES_TEXT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[85vh] h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="font-display text-2xl text-primary">How to Play — Red Queen</DialogTitle>
            <Button variant="ghost" size="sm" onClick={handleCopy} className="text-white/60 hover:text-white gap-1.5 mr-6">
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              <span className="text-xs">{copied ? 'Copied!' : 'Copy'}</span>
            </Button>
          </div>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-2 overflow-y-auto">
          <div className="py-2">

            <Section title="Goal">
              <Rule>Collect the highest total Heart card value across all cards you own at the end of the game.</Rule>
              <Rule>Hearts in your deck and discard pile both count.</Rule>
            </Section>

            <Section title="Your Deck">
              <Rule>Every player starts with a personal deck of 13 Diamond cards (2 through Ace).</Rule>
              <Rule>Your deck is private — you draw from it each round for your hand.</Rule>
              <Rule>When your deck is empty and you need to draw, your discard pile is shuffled back into your deck.</Rule>
              <Rule>Cards you buy during the Buy Phase are added to your discard pile and will eventually cycle back in.</Rule>
            </Section>

            <Section title="Round Structure">
              <Rule><strong>Simultaneous:</strong> Players take turns simultaneously — everyone plays their hand at the same time.</Rule>
              <Rule><strong>Draw:</strong> Each player draws 2 cards from their own deck to form their starting hand.</Rule>
              <Rule><strong>Play Phase:</strong> All players Hit or Stay at the same time. Hit to draw, Stay to lock in your score.</Rule>
              <Rule><strong>Buy Phase:</strong> Take turns buying one card at a time (lowest chips first). Pass when done.</Rule>
            </Section>

            <Section title="Hit Order">
              <Rule><strong>1.</strong> Draw a card.</Rule>
              <Rule><strong>2.</strong> Resolve ALL abilities — they always trigger, even on a bust.</Rule>
              <Rule><strong>3.</strong> Check for bust / Charlie / 21.</Rule>
            </Section>

            <Section title="Abilities">
              <Rule>Black card abilities (♠ Burn, ♣ Scry) trigger when drawn — including opening hands and redraws (after BOTH cards are drawn).</Rule>
              <Rule>All abilities are <strong>optional</strong> — you may skip any ability.</Rule>
            </Section>

            <Section title="Earning Chips">
              <Rule>When you <strong>don't bust</strong>: chips earned = hand score − 10 (minimum 0).</Rule>
              <Rule><strong>Clubs earn chip value as normal</strong> — no special bust survival.</Rule>
              <Rule><strong>Blackjack (Ace + face card/10 as opening 2):</strong> +8 bonus chips, hand discarded, redraw 2.</Rule>
              <Rule><strong>Hitting (non-Blackjack) 21:</strong> +3 bonus chips, hand discarded, redraw 2.</Rule>
              <Rule><strong>Five Card Charlie (5 cards without busting):</strong> +3 bonus chips, hand discarded, redraw 2.</Rule>
            </Section>

            <Section title="Card Values">
              <Rule>2–10: face value. J=11, Q=12, K=13, A=14 for VP/chips/cost. Ace counts as 1 or 11 for scoring to avoid bust.</Rule>
            </Section>

            <Section title="♠ Spades — Burn">
              <Rule>Permanently remove (burn) cards from your discard when drawn. Always optional.</Rule>
              <Rule><strong>Base (2–10):</strong> Burn up to 1 from discard.</Rule>
              <Rule><strong>J:</strong> Burn up to 1 from discard.</Rule>
              <Rule><strong>Q:</strong> Burn up to 2 from discard.</Rule>
              <Rule><strong>K:</strong> Burn up to 2 from discard.</Rule>
              <Rule><strong>A:</strong> Burn up to 3 from discard.</Rule>
            </Section>

            <Section title="♣ Clubs — Scry">
              <Rule>Peek at the top card(s) of your deck and optionally discard them. Always optional.</Rule>
              <Rule><strong>Base (2–10):</strong> Scry up to 1 from deck.</Rule>
              <Rule><strong>J:</strong> Scry up to 1 from deck.</Rule>
              <Rule><strong>Q:</strong> Scry up to 2 from deck.</Rule>
              <Rule><strong>K:</strong> Scry up to 2 from deck.</Rule>
              <Rule><strong>A:</strong> Scry up to 3 from deck.</Rule>
            </Section>

            <Section title="♥ Hearts & ♦ Diamonds">
              <Rule><strong>Hearts:</strong> Victory points equal to face value (J=11, Q=12, K=13, A=14). Collect to win!</Rule>
              <Rule><strong>Diamonds:</strong> Form your starting deck. All cards in your hand count toward your hand score, and chips earned = hand score − 10. Your entire starting deck is diamonds.</Rule>
            </Section>

            <Section title="Shop">
              <Rule>The Shop displays face-up cards equal to <strong>2 × the player count</strong>.</Rule>
              <Rule>Between rounds, <strong>ALL</strong> shop cards are discarded and replaced with fresh cards.</Rule>
              <Rule>Heart cards in the shop do <strong>NOT</strong> persist round to round.</Rule>
              <Rule>Card costs: 2=2, 3=3, 4=4 … 10=10, J=11, Q=12, K=13, A=14 chips.</Rule>
            </Section>

            <Section title="End of Game">
              <Rule>The game ends at the end of the round in which the shop deck runs out of cards.</Rule>
              <Rule>All players' Heart cards (deck + discard) are totalled.</Rule>
              <Rule>The player with the highest Heart value wins!</Rule>
            </Section>

            <Section title="Viewing Cards">
              <Rule>Click the card count badge next to any player's name to see their full hand, deck, and discard pile.</Rule>
            </Section>

          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}