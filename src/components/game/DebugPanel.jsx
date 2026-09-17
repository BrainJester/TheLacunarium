import React from 'react';
import { MAX_LOOSE } from './BiomeConfig';
import { getGridCell } from './IslandLogic';

export default function DebugPanel({ state, hoveredWorldPos, hoveredPieceSides, hoveredCloudMass, onReset }) {
  const mass = Object.keys(state.grid).length;

  let elevation = null;
  let gridPieceSides = null;
  if (hoveredWorldPos) {
    const cell = getGridCell(hoveredWorldPos.x, hoveredWorldPos.y);
    const key = `${cell.gx},${cell.gy}`;
    if (state.grid[key] !== undefined) {
      elevation = state.grid[key].elevation;
      // Only show grid piece code when not hovering a loose piece
      if (!hoveredPieceSides) {
        gridPieceSides = state.grid[key].sides;
      }
    }
  }

  const displaySides = hoveredPieceSides ?? gridPieceSides;

  const handleReset = () => {
    onReset();
  };

  return (
    <div className="absolute top-3 left-3 z-50 bg-black/60 text-white/80 text-xs font-mono rounded px-3 py-2 space-y-1">
      <div>mass: {mass}</div>
      <div>Loosies: {state.loosePieces.length}</div>
      <div>max Loosie: {MAX_LOOSE}</div>
      <div>clouds: {state.clouds.length}</div>
      <div>elevation: {elevation !== null ? elevation : '—'}</div>
      <div>piece: {displaySides ? `[${displaySides.join(',')}]` : '—'}</div>
      <div>cloud mass: {hoveredCloudMass !== null ? hoveredCloudMass : '—'}</div>
      <button
        className="mt-1 w-full bg-red-800/70 hover:bg-red-700/90 text-white/90 rounded px-2 py-0.5 cursor-pointer"
        onClick={handleReset}
      >
        reset
      </button>
    </div>
  );
}