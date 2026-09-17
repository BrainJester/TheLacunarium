import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Play, Users, Bot, User, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import RulesModal from './RulesModal';

export default function GameLobby({ onStartGame }) {
  const [players, setPlayers] = useState([
    { name: 'You', type: 'human' },
    { name: 'Bot 1', type: 'ai' },
  ]);
  const [showRules, setShowRules] = useState(false);

  const addPlayer = () => {
    if (players.length >= 4) return;
    const num = players.length + 1;
    setPlayers([...players, { name: `Bot ${num}`, type: 'ai' }]);
  };

  const removePlayer = (idx) => {
    if (players.length <= 2) return;
    setPlayers(players.filter((_, i) => i !== idx));
  };

  const updatePlayer = (idx, field, value) => {
    const updated = [...players];
    updated[idx] = { ...updated[idx], [field]: value };
    setPlayers(updated);
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] sm:min-h-[calc(100vh-6rem)] casino-felt flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        {/* Title */}
        <div className="text-center mb-10">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-casino font-black tracking-widest text-primary drop-shadow-[0_0_20px_rgba(246,200,67,0.5)]"
          >
            Red Queen
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-muted-foreground font-casino text-sm mt-2 tracking-[0.3em] uppercase"
          >
            Deckbuilding Blackjack
          </motion.p>
        </div>

        {/* Player Setup Card */}
        <div className="bg-transparent border border-white/40 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-5 h-5 text-white" />
            <h2 className="font-casino text-lg font-semibold text-white tracking-wider">PLAYERS</h2>
          </div>

          <div className="space-y-3">
            <AnimatePresence>
              {players.map((player, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-2"
                >
                  <div className="w-8 h-8 rounded-full bg-transparent border border-white/30 flex items-center justify-center text-xs font-bold text-white">
                    {idx + 1}
                  </div>
                  <Input
                    value={player.name}
                    onChange={(e) => updatePlayer(idx, 'name', e.target.value)}
                    className="flex-1 bg-transparent border-white/30 text-white font-body placeholder:text-white/30"
                    placeholder="Player name"
                  />
                  <Select
                    value={player.type}
                    onValueChange={(v) => updatePlayer(idx, 'type', v)}
                  >
                    <SelectTrigger className="w-28 bg-transparent border-white/30 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="human">
                        <span className="flex items-center gap-1.5">
                          <User className="w-3 h-3" /> Human
                        </span>
                      </SelectItem>
                      <SelectItem value="ai">
                        <span className="flex items-center gap-1.5">
                          <Bot className="w-3 h-3" /> AI
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {players.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removePlayer(idx)}
                      className="text-white/40 hover:text-red-400 h-8 w-8"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {players.length < 4 && (
            <Button
              variant="outline"
              onClick={addPlayer}
              className="w-full mt-4 border-dashed border-white/30 text-white/50 hover:text-primary bg-transparent"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Player ({players.length}/4)
            </Button>
          )}

          <Button
            onClick={() => onStartGame(players)}
            className="w-full mt-6 h-12 text-lg font-casino font-bold tracking-widest bg-primary text-white hover:bg-primary/80"
            disabled={players.length < 2}
          >
            <Play className="w-5 h-5 mr-2" /> Deal
          </Button>
        </div>

        <div className="flex justify-center mt-4">
          <button
            onClick={() => setShowRules(true)}
            className="flex items-center gap-1.5 text-white/50 hover:text-primary text-xs font-casino tracking-widest transition-colors"
          >
            <HelpCircle className="w-4 h-4" /> HOW TO PLAY
          </button>
        </div>

        <RulesModal open={showRules} onClose={() => setShowRules(false)} />
      </motion.div>
    </div>
  );
}