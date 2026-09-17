import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Trophy, RotateCcw, Heart, HelpCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import RulesModal from './RulesModal';
import { useProfile } from '@/lib/ProfileContext';
import { toast } from '@/components/ui/use-toast';

export default function GameOverScreen({ players, onRestart }) {
  const { refresh } = useProfile();
  const [showRules, setShowRules] = useState(false);
  const sorted = [...players].sort((a, b) => b.totalHeartValue - a.totalHeartValue);
  const winner = sorted[0];

  // Solo high score: the single human's total hearts/victory points.
  // Recorded only when exactly one human played, and only when it beats the
  // signed-in user's stored best.
  useEffect(() => {
    const humans = players.filter((p) => p.type === 'human');
    if (humans.length !== 1) return;
    const score = humans[0].totalHeartValue;
    if (!score || score <= 0) return;
    base44.functions
      .invoke('updateMyRedQueenRecord', { score })
      .then(() => refresh())
      .catch(() => {
        toast({
          title: 'Record save failed',
          description: 'Your Red Queen score could not be saved.',
          variant: 'destructive',
        });
      });
  }, [players, refresh]);

  return (
    <div className="min-h-[calc(100vh-5rem)] sm:min-h-[calc(100vh-6rem)] casino-felt flex items-center justify-center p-4 relative">
      <button
        onClick={() => setShowRules(true)}
        className="absolute top-4 right-4 text-muted-foreground hover:text-primary transition-colors">

        <HelpCircle className="w-5 h-5" />
      </button>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md text-center">

        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8">

          <Trophy className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-4xl font-casino font-black text-primary tracking-widest mb-2">
            {sorted.filter(p => p.totalHeartValue === winner.totalHeartValue).length > 1 ? 'A shared victory!' : `${winner.name} Wins!`}
          </h1>


        </motion.div>

        <div className="bg-transparent border border-white/40 rounded-2xl p-6 mb-6 space-y-3">
          {sorted.map((p, i) =>
          <motion.div
            key={p.index}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className={`flex items-center justify-between p-3 rounded-lg border ${
            i === 0 ? 'bg-transparent border-white/60' : 'bg-transparent border-white/20'}`
            }>

              <div className="flex items-center gap-3">
                <span className="text-lg font-bold font-display text-muted-foreground">
                  #{i + 1}
                </span>
                <span className="font-semibold text-2xl">{p.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="chips-badge-sm" style={{ fontSize: '1.2rem', minWidth: '2rem', height: '2rem' }}>{p.diamonds}</span>
                <span className="text-2xl text-red-400 font-bold flex items-center gap-1">
                  <Heart className="w-3 h-3 fill-red-400" />
                  {p.totalHeartValue}
                </span>
              </div>
            </motion.div>
          )}
        </div>

        <Button
          onClick={onRestart}
          className="bg-primary text-primary-foreground hover:bg-primary/90 font-casino tracking-widest px-8 h-12">

          <RotateCcw className="w-4 h-4 mr-2" /> PLAY AGAIN
        </Button>
      </motion.div>
      <RulesModal open={showRules} onClose={() => setShowRules(false)} />
    </div>);
}