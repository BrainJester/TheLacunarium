import React, { useRef, useEffect, useCallback, useState, lazy, Suspense } from 'react';
import { PIECE_SIZE } from './BiomeConfig';
import { getNeighborOffset, getOpposite, sidesMatch } from './PieceGeometry';
import { createInitialState, serializeState, deserializeState, updatePhysics } from './GameState';
import { findSnapTarget, countSurroundingFilled } from './IslandLogic';
import { renderGame } from './Renderer';
import DebugPanel from './DebugPanel';
import { base44 } from '@/api/base44Client';
import { createIslandSession } from '@/lib/islandPersistence';
const Island3DView = lazy(() => import('./Island3DView'));
import { Mountain } from 'lucide-react';

// Check if piece sides fit into an empty pit cell at (gx,gy)
function pieceFitsPit(grid, gx, gy, sides) {
  for (let i = 0; i < 4; i++) {
    const off = getNeighborOffset(i);
    const nk = `${gx + off.dx},${gy + off.dy}`;
    if (grid[nk]) {
      const oppSide = getOpposite(i);
      if (!sidesMatch(sides[i], grid[nk].sides[oppSide])) return false;
    }
  }
  return true;
}

// Find the cluster of touching clouds at a world position (or null)
function getCloudCluster(clouds, wx, wy) {
  const cloudRadius = PIECE_SIZE * 0.45;
  let seedIdx = -1;
  for (let i = 0; i < clouds.length; i++) {
    if (Math.hypot(clouds[i].x - wx, clouds[i].y - wy) <= cloudRadius) {
      seedIdx = i;
      break;
    }
  }
  if (seedIdx === -1) return null;

  const used = new Set([seedIdx]);
  const queue = [seedIdx];
  while (queue.length > 0) {
    const ci = queue.shift();
    for (let j = 0; j < clouds.length; j++) {
      if (used.has(j)) continue;
      if (Math.hypot(clouds[ci].x - clouds[j].x, clouds[ci].y - clouds[j].y) < PIECE_SIZE * 1.5) {
        used.add(j);
        queue.push(j);
      }
    }
  }
  return used;
}

function getCloudMassAt(clouds, wx, wy) {
  const cluster = getCloudCluster(clouds, wx, wy);
  return cluster ? cluster.size : null;
}

export default function GameCanvas({ mode, onMassChange }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const sessionRef = useRef(null);
  const resetRef = useRef(false);
  const show3DRef = useRef(false);
  const [saveStatus, setSaveStatus] = useState('loading');
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const massCallback = useRef(onMassChange); massCallback.current = onMassChange;
  const [loaded, setLoaded] = useState(false);
  const STARTING_ZOOM = 0.8;
  const cameraRef = useRef({ x: PIECE_SIZE / 2, y: PIECE_SIZE / 2, zoom: STARTING_ZOOM });
  const dragRef = useRef(null);
  const panRef = useRef(null);
  const hoveredPieceRef = useRef(null);
  const animRef = useRef(null);
  const lastTimeRef = useRef(0);
  const saveTimerRef = useRef(0);
  const lastMassRef = useRef(0);
  const [, forceUpdate] = useState(0);
  const [hoveredWorldPos, setHoveredWorldPos] = useState(null);
  const [hoveredPieceSides, setHoveredPieceSides] = useState(null);
  const [hoveredCloudMass, setHoveredCloudMass] = useState(null);
  const [, setResetKey] = useState(0);
  const [show3D, setShow3D] = useState(false);

  // Resize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const resize = () => {
      canvas.width = canvas.clientWidth || window.innerWidth;
      canvas.height = canvas.clientHeight || window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    let active = true, initialized = false;
    const session = createIslandSession((name, data) => base44.functions.invoke(name, data), status => { if (active) setSaveStatus(status); });
    sessionRef.current = session;
    setLoaded(false); setLoadError(false);
    session.load().then(data => {
      if (!active) return;
      stateRef.current = deserializeState(data) || createInitialState();
      initialized = true; setLoaded(true);
    }).catch(() => { if (active) setLoadError(true); });
    const flush = () => { if (initialized && stateRef.current && !resetRef.current) session.save(serializeState(stateRef.current)).catch(() => {}); };
    const hide = () => { if (document.hidden) flush(); };
    document.addEventListener('visibilitychange', hide);
    return () => { active = false; document.removeEventListener('visibilitychange', hide); flush(); };
  }, [attempt]);

  // Game loop
  useEffect(() => {
    if (!loaded) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let running = true;

    const loop = (timestamp) => {
      if (!running) return;
      const dt = Math.min(timestamp - (lastTimeRef.current || timestamp), 50);
      lastTimeRef.current = timestamp;

      const state = stateRef.current;
      if (resetRef.current || document.hidden) { animRef.current = requestAnimationFrame(loop); return; }
      updatePhysics(state, dt);

      const mass = Object.keys(state.grid).length;
      if (mass !== lastMassRef.current) {
        lastMassRef.current = mass;
        massCallback.current?.(mass);
      }

      // Save to the user's account every few seconds
      saveTimerRef.current += dt;
      if (saveTimerRef.current > 5000) {
        saveTimerRef.current = 0;
        sessionRef.current.save(serializeState(state)).catch(() => {});
      }

      if (!show3DRef.current) renderGame(ctx, canvas, state, cameraRef.current, state.time, hoveredPieceRef.current);

      // Draw snap preview if dragging
      if (dragRef.current && dragRef.current.piece) {
        const p = dragRef.current.piece;
        const target = findSnapTarget(state.grid, p.x, p.y, p.sides, p.isWild);
        if (target) {
          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.scale(cameraRef.current.zoom, cameraRef.current.zoom);
          ctx.translate(-cameraRef.current.x, -cameraRef.current.y);

          const tx = target.gx * PIECE_SIZE;
          const ty = target.gy * PIECE_SIZE;
          ctx.strokeStyle = 'rgba(100, 200, 255, 0.6)';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(tx, ty, PIECE_SIZE, PIECE_SIZE);
          ctx.setLineDash([]);

          ctx.restore();
        }
      }

      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [loaded]);

  // Convert screen coords to world coords
  const screenToWorld = useCallback((sx, sy) => {
    const canvas = canvasRef.current;
    const cam = cameraRef.current;
    return {
      x: (sx - canvas.width / 2) / cam.zoom + cam.x,
      y: (sy - canvas.height / 2) / cam.zoom + cam.y,
    };
  }, []);

  // Find piece under world coords
  // Clear all pit highlights
  const clearPitHighlights = useCallback(() => {
    for (const p of stateRef.current.loosePieces) {
      p.pitHighlightTarget = 0;
    }
  }, []);

  const findPieceAt = useCallback((wx, wy) => {
    const state = stateRef.current;
    const halfSize = PIECE_SIZE / 2;

    // Check loose pieces (reverse for top-most first)
    for (let i = state.loosePieces.length - 1; i >= 0; i--) {
      const p = state.loosePieces[i];
      if (Math.abs(wx - p.x) < halfSize && Math.abs(wy - p.y) < halfSize) {
        return { type: 'loose', index: i, piece: p };
      }
    }
    return null;
  }, []);

  // Pit detection: highlight a loose piece that would fit the hovered empty cell.
  // Requires 7+ surrounding pieces; clouds and loose pieces never block it.
  const updatePitHighlight = useCallback((wx, wy) => {
    clearPitHighlights();
    const state = stateRef.current;
    const hoverGx = Math.floor(wx / PIECE_SIZE);
    const hoverGy = Math.floor(wy / PIECE_SIZE);
    const cellKey = `${hoverGx},${hoverGy}`;
    if (!state.grid[cellKey] && countSurroundingFilled(state.grid, hoverGx, hoverGy) >= 7) {
      for (const p of state.loosePieces) {
        if (pieceFitsPit(state.grid, hoverGx, hoverGy, p.sides)) {
          p.pitHighlightTarget = 1;
          break;
        }
      }
    }
  }, [clearPitHighlights]);

  // Click/tap a cloud: push the whole cluster away from the click point,
  // scaled by how close the click is to each cloud's center.
  const applyCloudImpulse = useCallback((clickX, clickY) => {
    const state = stateRef.current;
    const cluster = getCloudCluster(state.clouds, clickX, clickY);
    if (!cluster) return false;
    const cloudRadius = PIECE_SIZE * 0.45;
    const STRENGTH = 700;
    const falloff = cloudRadius * 2;
    for (const idx of cluster) {
      const c = state.clouds[idx];
      const dx = c.x - clickX;
      const dy = c.y - clickY;
      const dist = Math.hypot(dx, dy);
      let nx, ny;
      if (dist < 0.1) { nx = 0; ny = -1; }
      else { nx = dx / dist; ny = dy / dist; }
      const factor = Math.max(0, 1 - dist / falloff);
      c.vx += nx * STRENGTH * factor;
      c.vy += ny * STRENGTH * factor;
    }
    return true;
  }, []);

  // Pointer handlers
  const handlePointerDown = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy);

    const hit = findPieceAt(world.x, world.y);

    if (hit) {
      // Start dragging piece
      hit.piece.dragging = true;
      dragRef.current = {
        piece: hit.piece,
        index: hit.index,
        offsetX: hit.piece.x - world.x,
        offsetY: hit.piece.y - world.y,
      };
    } else if (applyCloudImpulse(world.x, world.y)) {
      // Clicked a cloud — impulse applied, no pan/drag
    } else {
      // Start panning
      panRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        camX: cameraRef.current.x,
        camY: cameraRef.current.y,
      };
    }

    // Run pit highlight on tap too, so clouds never block lighting up a
    // matching loose piece on mobile.
    updatePitHighlight(world.x, world.y);

    canvas.setPointerCapture(e.pointerId);
  }, [screenToWorld, findPieceAt, applyCloudImpulse, updatePitHighlight]);

  const handlePointerMove = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (dragRef.current) {
      const world = screenToWorld(sx, sy);
      dragRef.current.piece.x = world.x + dragRef.current.offsetX;
      dragRef.current.piece.y = world.y + dragRef.current.offsetY;
    } else {
      // Track hovered piece
      const world = screenToWorld(sx, sy);
      const hit = findPieceAt(world.x, world.y);
      hoveredPieceRef.current = hit ? hit.piece : null;
      setHoveredWorldPos({ x: world.x, y: world.y });
      setHoveredPieceSides(hit ? hit.piece.sides : null);
      setHoveredCloudMass(getCloudMassAt(stateRef.current.clouds, world.x, world.y));

      // Pit detection: highlight a loose piece that would fit the hovered empty cell
      updatePitHighlight(world.x, world.y);
    }
    if (panRef.current) {
      const dx = (e.clientX - panRef.current.startX) / cameraRef.current.zoom;
      const dy = (e.clientY - panRef.current.startY) / cameraRef.current.zoom;
      cameraRef.current.x = panRef.current.camX - dx;
      cameraRef.current.y = panRef.current.camY - dy;
    }
  }, [screenToWorld, updatePitHighlight]);

  const handlePointerUp = useCallback(() => {
    clearPitHighlights();
    if (dragRef.current) {
      const state = stateRef.current;
      const p = dragRef.current.piece;
      p.dragging = false;
      p.vx = 0;
      p.vy = 0;

      // Check for snap — animate piece into position over 0.6s then place
      const target = findSnapTarget(state.grid, p.x, p.y, p.sides, p.isWild);
      if (target) {
        p.snapping = true;
        p.snapTarget = target;
        p.snapStartX = p.x;
        p.snapStartY = p.y;
        p.snapStartTime = state.time;
        p.snapDuration = 600;
      }

      dragRef.current = null;
    }
    panRef.current = null;
  }, []);

  // Zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const cam = cameraRef.current;
    const factor = e.deltaY > 0 ? 0.9 : 1.1;

    // Compute min zoom so island fits within 2x canvas dims
    const canvas = canvasRef.current;
    const state = stateRef.current;
    const keys = Object.keys(state.grid);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const key of keys) {
      const [gx, gy] = key.split(',').map(Number);
      if (gx < minX) minX = gx;
      if (gx > maxX) maxX = gx;
      if (gy < minY) minY = gy;
      if (gy > maxY) maxY = gy;
    }
    const islandH = (maxY - minY + 1) * PIECE_SIZE;
    // Min zoom: island fits within double its height on screen; max zoom: starting zoom
    const minZoom = canvas.height / (islandH * 2);
    const maxZoom = STARTING_ZOOM;
    const clampedMinZoom = Math.min(minZoom, maxZoom);

    cam.zoom = Math.max(clampedMinZoom, Math.min(maxZoom, cam.zoom * factor));
  }, []);

  // Touch support for zoom
  const touchesRef = useRef([]);
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      touchesRef.current = [
        { x: e.touches[0].clientX, y: e.touches[0].clientY },
        { x: e.touches[1].clientX, y: e.touches[1].clientY },
      ];
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 2 && touchesRef.current.length === 2) {
      const oldDist = Math.hypot(
        touchesRef.current[0].x - touchesRef.current[1].x,
        touchesRef.current[0].y - touchesRef.current[1].y
      );
      const newDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = newDist / oldDist;
      cameraRef.current.zoom = Math.max(0.15, Math.min(3, cameraRef.current.zoom * factor));
      touchesRef.current = [
        { x: e.touches[0].clientX, y: e.touches[0].clientY },
        { x: e.touches[1].clientX, y: e.touches[1].clientY },
      ];
    }
  }, []);

  const handleReset = useCallback(async () => {
    if (resetRef.current || !window.confirm('Start a new island? Your best record is kept.')) return;
    resetRef.current = true;
    try {
      await sessionRef.current.reset();
      stateRef.current = createInitialState();
      dragRef.current = null; panRef.current = null;
      cameraRef.current = { x: PIECE_SIZE / 2, y: PIECE_SIZE / 2, zoom: STARTING_ZOOM };
      setResetKey(k => k + 1);
    } catch { /* retain the existing island */ }
    finally { resetRef.current = false; }
  }, []);

  return (
    <>
    {show3D && loaded && <Suspense fallback={<p className="p-6">Opening 3D island…</p>}><Island3DView stateRef={stateRef} /></Suspense>}
    {loadError && <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-slate-950 text-white p-6" role="alert"><p>Your island could not be loaded. Your saved island has not been changed.</p><button className="mt-4 underline" onClick={() => setAttempt(n => n + 1)}>Retry loading</button></div>}
    <div className="absolute top-3 left-3 z-40 rounded bg-black/70 p-2 text-xs text-white" role="status">{saveStatus === "conflict" ? "Changed in another tab. Reload to continue saving." : saveStatus === "error" ? "Save failed. Retrying while you play." : saveStatus === "saving" ? "Saving…" : saveStatus === "loading" ? "Loading…" : "Saved"}</div>
    {loaded && <button className="absolute bottom-3 left-3 z-40 rounded bg-black/70 p-3 text-xs text-white" onClick={handleReset}>Reset island</button>}

    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing touch-none"
      style={{ display: show3D ? 'none' : 'block', pointerEvents: loaded ? 'auto' : 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    />

    {/* 3D toggle button — branz mode only */}
    {mode === 'tester' && loaded && (
      <button
        onClick={() => setShow3D(v => { show3DRef.current = !v; return !v; })} aria-label={show3D ? "Show 2D island" : "Show 3D island"}
        className="absolute bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium shadow-lg transition-all"
        style={{
          background: show3D ? 'rgba(100,180,255,0.25)' : 'rgba(255,255,255,0.12)',
          border: show3D ? '1px solid rgba(100,180,255,0.6)' : '1px solid rgba(255,255,255,0.25)',
          color: show3D ? '#a8d8ff' : 'rgba(255,255,255,0.8)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <Mountain size={16} />
      </button>
    )}

    {mode === 'tester' && !show3D && loaded && stateRef.current && (
      <DebugPanel
        state={stateRef.current}
        hoveredWorldPos={hoveredWorldPos}
        hoveredPieceSides={hoveredPieceSides}
        hoveredCloudMass={hoveredCloudMass}
        onReset={handleReset}
      />
    )}
    </>
  );
}