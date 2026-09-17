import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProfile } from '@/lib/ProfileContext';
import GameLobby from '@/components/game/redqueen/GameLobby';
import GameBoard from '@/components/game/redqueen/GameBoard';

// Red Queen — a deckbuilding blackjack card game, imported wholesale and
// kept in its own casino visual style via the .red-queen-scope token wrapper
// (the surrounding site chrome stays monochrome). The solo high score
// (single human's total hearts) is recorded by GameOverScreen.
export default function RedQueen() {
  const { loading, error, isSignedIn } = useProfile();
  const [gameState, setGameState] = useState('lobby');
  const [players, setPlayers] = useState([]);

  const handleStartGame = (playerList) => {
    setPlayers(playerList);
    setGameState('playing');
  };

  const handleRestart = () => {
    setGameState('lobby');
    setPlayers([]);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-foreground/60">
        Loading…
      </div>
    );
  }

  if (error) return <p className="p-8 text-center">Please retry loading your account using the message above.</p>;

  if (!isSignedIn) {
    return (
      <div className="red-queen-scope casino-felt flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center px-6 text-center sm:min-h-[calc(100vh-6rem)]">
        <h1
          className="text-4xl font-casino font-black tracking-widest text-primary sm:text-5xl"
          style={{ textShadow: '0 0 12px rgba(220,38,38,0.7)' }}
        >
          Red Queen
        </h1>
        <p className="mt-2 font-casino text-sm uppercase tracking-[0.3em] text-foreground/70">
          Deckbuilding Blackjack
        </p>
        <p className="mt-6 max-w-sm text-foreground/70">
          Sign in to take a seat at the table and chase the solo high score.
        </p>
        <Link
          to="/login?returnTo=%2Fred-queen"
          className="mt-8 inline-flex rounded-full bg-primary px-8 py-4 text-xs font-bold uppercase tracking-[0.22em] text-primary-foreground transition hover:bg-primary/90"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="red-queen-scope">
      {gameState === 'playing' ? (
        <GameBoard players={players} onRestart={handleRestart} />
      ) : (
        <GameLobby onStartGame={handleStartGame} />
      )}
    </div>
  );
}