import { PIECE_SIZE, MAX_LOOSE } from './BiomeConfig';
import { generateRandomSides } from './PieceGeometry';
import { playKnockSound } from './KnockSound';
import {
  runPromotions, getIslandCenter, getIslandPeak, getCoastCells,
  isOverIsland, getGridCell, bfsToEdge, findSnapTargetPhysics
} from './IslandLogic';

export function serializeState(state) {
  return {
    schemaVersion: 1,
    grid: Object.fromEntries(Object.entries(state.grid).map(([key, cell]) => [key, { sides: [...cell.sides], elevation: cell.elevation }])),
    loosePieces: state.loosePieces.map(p => ({
      x: p.x, y: p.y, sides: p.sides,
      isWild: p.isWild || false,
      wildMorphTimer: p.wildMorphTimer || 0,
      hasBeenInWater: p.hasBeenInWater || false,
      justSpawned: p.justSpawned || false,
    })),
    clouds: state.clouds.map(c => ({
      x: c.x, y: c.y, sides: c.sides,
    })),
  };
}

export function deserializeState(data) {
  if (data == null) return null;
  if (data.schemaVersion !== 1 || !data.grid || Array.isArray(data.grid) || !Object.keys(data.grid).length) throw Error('Unsupported island save.');
  for (const cell of Object.values(data.grid)) if (!Array.isArray(cell.sides) || cell.sides.length !== 4) throw Error('Invalid island save.');
  runPromotions(data.grid);
  for (const key of Object.keys(data.grid)) {
    data.grid[key].prevElevation = null;
    data.grid[key].elevationChangeTime = null;
  }
  return {
    grid: data.grid,
    loosePieces: (data.loosePieces || []).map(p => ({ ...p, vx: 0, vy: 0 })),
    clouds: (data.clouds || []).map(c => ({ ...c, vx: 0, vy: 0 })),
    trees: [],
    spawnTimer: 0,
    time: 0,
  };
}

export function createInitialState() {
  const seedSides = generateRandomSides();
  const grid = { '0,0': { sides: seedSides, elevation: 0 } };
  runPromotions(grid);
  return {
    grid,
    loosePieces: [],
    clouds: [],
    trees: [],
    spawnTimer: 0,
    time: 0,
  };
}

// Spawn a new loose piece at a random location around the island
export function spawnPiece(state) {
  if (state.loosePieces.length >= MAX_LOOSE) return;

  const center = getIslandCenter(state.grid);
  let pieceX, pieceY;
  let attempts = 0;

  do {
    const angle = Math.random() * Math.PI * 2;
    const dist = 400 + Math.random() * 300;
    pieceX = center.x + Math.cos(angle) * dist;
    pieceY = center.y + Math.sin(angle) * dist;
    attempts++;
    if (attempts > 100) return; // If island fills everything, skip this spawn
  } while (isOverIsland(state.grid, pieceX, pieceY));

  const piece = {
    x: pieceX,
    y: pieceY,
    sides: generateRandomSides(),
    vx: 0,
    vy: 0,
    isRain: false,
    hasBeenInWater: false,
    justSpawned: true,
  };
  state.loosePieces.push(piece);
}

// Spawn a replacement piece in the water (ignores cloud count so clouds don't block spawning)
export function spawnPieceInWater(state) {
  if (state.loosePieces.length >= MAX_LOOSE) return;

  const center = getIslandCenter(state.grid);
  let pieceX, pieceY;
  let attempts = 0;

  do {
    const angle = Math.random() * Math.PI * 2;
    const dist = 400 + Math.random() * 300;
    pieceX = center.x + Math.cos(angle) * dist;
    pieceY = center.y + Math.sin(angle) * dist;
    attempts++;
    if (attempts > 100) return;
  } while (isOverIsland(state.grid, pieceX, pieceY));

  state.loosePieces.push({
    x: pieceX,
    y: pieceY,
    sides: generateRandomSides(),
    vx: 0,
    vy: 0,
    isRain: false,
    hasBeenInWater: false,
    justSpawned: true,
  });
}

// Compute mass-scaled drift speed (base = 57.5)
function getDriftSpeed(mass) {
  const BASE = 57.5;
  if (mass <= 30) return BASE * 0.5;
  if (mass <= 100) {
    // 0.5x at mass=30 → 1x at mass=100
    const t = (mass - 30) / (100 - 30);
    return BASE * (0.5 + 0.5 * t);
  }
  if (mass <= 300) {
    // 1x at mass=100 → 2x at mass=300
    const t = (mass - 100) / (300 - 100);
    return BASE * (1 + t);
  }
  return BASE * 2;
}

// Main physics update
export function updatePhysics(state, dt) {
  const dtSec = dt / 1000;
  state.time += dt;

  const center = getIslandCenter(state.grid);
  const peak = getIslandPeak(state.grid);
  const mass = Object.keys(state.grid).length;
  const coast = getCoastCells(state.grid);

  // Spawn timer — rate scales linearly with mass (clamp 330ms–1000ms)
  // max loose pieces scale logarithmically with mass (clamp 0–25)
  const spawnInterval = Math.max(330, Math.min(1000, 1000 - (mass / 300) * (1000 - 330)));
  const maxSpawns = Math.min(25, Math.max(0, Math.round(25 * Math.log(1 + mass) / Math.log(1 + 300))));
  state.spawnTimer += dt;
  if (state.spawnTimer > spawnInterval && state.loosePieces.length < maxSpawns) {
    state.spawnTimer = 0;
    spawnPiece(state);
  }

  // Update loose pieces
  for (let i = state.loosePieces.length - 1; i >= 0; i--) {
    const p = state.loosePieces[i];
    if (p.dragging) continue;

    // Snap animation: ease piece into grid position, then place it
    if (p.snapping) {
      const elapsed = state.time - p.snapStartTime;
      const t = Math.min(1, elapsed / p.snapDuration);
      const ease = 1 - Math.pow(1 - t, 3); // cubic ease-out
      const destX = p.snapTarget.gx * PIECE_SIZE + PIECE_SIZE / 2;
      const destY = p.snapTarget.gy * PIECE_SIZE + PIECE_SIZE / 2;
      p.x = p.snapStartX + (destX - p.snapStartX) * ease;
      p.y = p.snapStartY + (destY - p.snapStartY) * ease;
      if (t >= 1) {
        placePiece(state, p, p.snapTarget.gx, p.snapTarget.gy);
        state.loosePieces.splice(i, 1);
      }
      continue;
    }

    const overIsland = isOverIsland(state.grid, p.x, p.y);

    if (!overIsland) {
      p.hasBeenInWater = true;
      p.justSpawned = false;
    }

    // In water: preserve existing inertia, add drift force on top
    if (!overIsland) {
      const dx = center.x - p.x;
      const dy = center.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 1) {
        const nx = dx / dist;
        const ny = dy / dist;
        const ebb = Math.sin(state.time * 0.001 + p.x * 0.01) * 0.3 + 0.7;
        const driftSpeed = getDriftSpeed(mass);
        p.vx += nx * driftSpeed * ebb * dtSec;
        p.vy += ny * driftSpeed * ebb * dtSec;
      }

      // Repel from other loose pieces (circle collision, radius = PIECE_SIZE/2)
      for (let j = 0; j < state.loosePieces.length; j++) {
        if (j === i) continue;
        const other = state.loosePieces[j];
        const odx = p.x - other.x;
        const ody = p.y - other.y;
        const odist = Math.hypot(odx, ody);
        const minDist = PIECE_SIZE;
        if (odist < minDist && odist > 0.1) {
          const overlap = (minDist - odist) / minDist;
          p.vx += (odx / odist) * overlap * 120 * dtSec;
          p.vy += (ody / odist) * overlap * 120 * dtSec;
        }
      }

      // Repel from coast
      for (const c of coast) {
        const cdx = p.x - c.x;
        const cdy = p.y - c.y;
        const cdist = Math.hypot(cdx, cdy);
        if (cdist < PIECE_SIZE * 1.5 && cdist > 1) {
          const force = (PIECE_SIZE * 1.5 - cdist) / (PIECE_SIZE * 1.5);
          p.vx += (cdx / cdist) * force * 80 * dtSec;
          p.vy += (cdy / cdist) * force * 80 * dtSec;
        }
      }
    }

    // Repel from other loose pieces regardless of location
    if (!overIsland) {
      // already handled above in the water block
    } else {
      for (let j = 0; j < state.loosePieces.length; j++) {
        if (j === i) continue;
        const other = state.loosePieces[j];
        const odx = p.x - other.x;
        const ody = p.y - other.y;
        const odist = Math.hypot(odx, ody);
        const minDist = PIECE_SIZE;
        if (odist < minDist && odist > 0.1) {
          const overlap = (minDist - odist) / minDist;
          p.vx += (odx / odist) * overlap * 120 * dtSec;
          p.vy += (ody / odist) * overlap * 120 * dtSec;
        }
      }
    }

    if (overIsland) {
      // On island: slide downhill
      const cell = getGridCell(p.x, p.y);
      const cellKey = `${cell.gx},${cell.gy}`;
      const elev = state.grid[cellKey]?.elevation || 0;

      // Find downhill direction
      let bestDir = null;
      let bestElev = elev;
      for (let d = 0; d < 4; d++) {
        const offsets = [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }];
        const nx = cell.gx + offsets[d].dx;
        const ny = cell.gy + offsets[d].dy;
        const nk = `${nx},${ny}`;
        if (state.grid[nk] && state.grid[nk].elevation < bestElev) {
          bestElev = state.grid[nk].elevation;
          bestDir = offsets[d];
        }
        if (!state.grid[nk]) {
          // Adjacent to water - slide toward it
          bestDir = offsets[d];
          bestElev = -1;
          break;
        }
      }

      if (bestDir && bestElev < elev) {
        p.vx += bestDir.dx * 50 * dtSec;
        p.vy += bestDir.dy * 50 * dtSec;
      } else {
        // Plateau - BFS to find exit
        const exitDir = bfsToEdge(state.grid, cell.gx, cell.gy);
        p.vx += exitDir.dx * 35 * dtSec;
        p.vy += exitDir.dy * 35 * dtSec;
      }
    }

    // Auto-snap check: works for both water AND island pieces (wild pieces never auto-snap)
    if (!p.isWild) {
      const snapTarget = findSnapTargetPhysics(state.grid, p.x, p.y, p.sides);
      if (snapTarget) {
        const destX = snapTarget.gx * PIECE_SIZE + PIECE_SIZE / 2;
        const destY = snapTarget.gy * PIECE_SIZE + PIECE_SIZE / 2;
        const sdx = destX - p.x;
        const sdy = destY - p.y;
        const sdist = Math.hypot(sdx, sdy);
        if (sdist < 5) {
          // Close enough — place it
          const key = `${snapTarget.gx},${snapTarget.gy}`;
          state.grid[key] = { sides: p.sides, elevation: 0 };
          playKnockSound();
          runPromotions(state.grid, state.time);
          state.loosePieces.splice(i, 1);
          continue;
        } else {
          // Accelerate toward destination (magnetic pull)
          const pull = 200;
          p.vx += (sdx / sdist) * pull * dtSec;
          p.vy += (sdy / sdist) * pull * dtSec;
        }
      }
    }

    // Wild pieces morph their sides every 0.25s while floating freely (not dragging/snapping)
    if (p.isWild && !p.dragging && !p.snapping) {
      p.wildMorphTimer = (p.wildMorphTimer || 0) + dt;
      if (p.wildMorphTimer >= 250) {
        p.wildMorphTimer = 0;
        p.sides = generateRandomSides();
      }
    }

    // Track how long a piece has been in the same grid cell
    const currentCell = getGridCell(p.x, p.y);
    const currentCellKey = `${currentCell.gx},${currentCell.gy}`;
    if (p.cellKey !== currentCellKey) {
      p.cellKey = currentCellKey;
      p.timeInCell = 0;
    } else {
      p.timeInCell = (p.timeInCell || 0) + dt;
    }

    // Apply velocity with damping
    p.vx *= Math.pow(0.95, dtSec * 60);
    p.vy *= Math.pow(0.95, dtSec * 60);
    p.x += p.vx * dtSec;
    p.y += p.vy * dtSec;
  }

  // Cloud condition 1: piece in same cell for 30s → becomes a cloud
  for (let i = state.loosePieces.length - 1; i >= 0; i--) {
    const p = state.loosePieces[i];
    if (p.dragging) continue;
    if ((p.timeInCell || 0) >= 30000) {
      // Start exit animation on piece (shrink/fade out over 500ms)
      p.transitionOut = true;
      p.transitionStart = state.time;
      p.transitionDuration = 500;
      p.onTransitionDone = () => {
        const idx = state.loosePieces.indexOf(p);
        if (idx >= 0) state.loosePieces.splice(idx, 1);
        // Spawn cloud with grow/fade-in animation
        state.clouds.push({ x: p.x, y: p.y - 50, sides: p.sides, vx: 0, vy: 0, transitionIn: true, transitionStart: state.time, transitionDuration: 500 });
        spawnPieceInWater(state);
        state.spawnTimer = 0;
      };
      p.timeInCell = -Infinity; // prevent re-triggering
    }
  }

  // Cloud condition 2: 3+ pieces in the same grid space → one becomes cloud per 5s
  // Group pieces by grid cell
  if (!state.cloudGroupTimers) state.cloudGroupTimers = {};
  const cellGroups = {};
  for (let i = 0; i < state.loosePieces.length; i++) {
    const p = state.loosePieces[i];
    const cell = getGridCell(p.x, p.y);
    const key = `${cell.gx},${cell.gy}`;
    if (!cellGroups[key]) cellGroups[key] = [];
    cellGroups[key].push(i);
  }
  // Clear timers for cells that no longer have 3+ pieces
  for (const key of Object.keys(state.cloudGroupTimers)) {
    if (!cellGroups[key] || cellGroups[key].length < 3) {
      delete state.cloudGroupTimers[key];
    }
  }
  // Advance timers and fire conversions
  for (const [key, indices] of Object.entries(cellGroups)) {
    if (indices.length < 3) continue;
    state.cloudGroupTimers[key] = (state.cloudGroupTimers[key] || 0) + dt;
    if (state.cloudGroupTimers[key] >= 5000) {
      state.cloudGroupTimers[key] = 0;
      // Convert one piece (last in list for this cell) — animate out then spawn cloud
      const removeIdx = indices[indices.length - 1];
      const p = state.loosePieces[removeIdx];
      p.transitionOut = true;
      p.transitionStart = state.time;
      p.transitionDuration = 500;
      p.onTransitionDone = () => {
        const idx = state.loosePieces.indexOf(p);
        if (idx >= 0) state.loosePieces.splice(idx, 1);
        state.clouds.push({ x: p.x, y: p.y - 50, sides: p.sides, vx: 0, vy: 0, transitionIn: true, transitionStart: state.time, transitionDuration: 500 });
        spawnPieceInWater(state);
        state.spawnTimer = 0;
      };
    }
  }

  // Fire transition callbacks for pieces that have finished their exit animation
  for (let i = state.loosePieces.length - 1; i >= 0; i--) {
    const p = state.loosePieces[i];
    if (p.transitionOut && p.onTransitionDone) {
      const elapsed = state.time - p.transitionStart;
      if (elapsed >= p.transitionDuration) {
        p.onTransitionDone();
        // onTransitionDone splices piece out, so don't access p after this
      }
    }
  }

  // Animate pit-highlight fade (0.5s in/out)
  {
    const hlSpeed = dt / 500;
    for (const p of state.loosePieces) {
      const target = p.pitHighlightTarget || 0;
      const level = p.pitHighlightLevel || 0;
      if (level < target) p.pitHighlightLevel = Math.min(target, level + hlSpeed);
      else if (level > target) p.pitHighlightLevel = Math.max(target, level - hlSpeed);
    }
  }

  // Update clouds
  updateClouds(state, dtSec, peak);
}

function updateClouds(state, dtSec, peak) {
  const center = getIslandCenter(state.grid);

  for (let i = 0; i < state.clouds.length; i++) {
    const c = state.clouds[i];

    const overIsland = isOverIsland(state.grid, c.x, c.y);

    if (!overIsland) {
      // Not over island: drift toward center of mass
      const dx = center.x - c.x;
      const dy = center.y - c.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 1) {
        c.vx += (dx / dist) * 20 * dtSec;
        c.vy += (dy / dist) * 20 * dtSec;
      }
    } else {
      // Over island: move uphill (inverse of piece downhill logic)
      const cell = getGridCell(c.x, c.y);
      const cellKey = `${cell.gx},${cell.gy}`;
      const elev = state.grid[cellKey]?.elevation || 0;

      let bestDir = null;
      let bestElev = elev;
      const offsets = [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }];
      for (let d = 0; d < 4; d++) {
        const nx = cell.gx + offsets[d].dx;
        const ny = cell.gy + offsets[d].dy;
        const nk = `${nx},${ny}`;
        if (state.grid[nk] && state.grid[nk].elevation > bestElev) {
          bestElev = state.grid[nk].elevation;
          bestDir = offsets[d];
        }
      }

      if (bestDir) {
        c.vx += bestDir.dx * 30 * dtSec;
        c.vy += bestDir.dy * 30 * dtSec;
      }
      // If already at peak, drift toward peak coords
      else if (peak) {
        const dx = peak.x - c.x;
        const dy = peak.y - c.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 1) {
          c.vx += (dx / dist) * 10 * dtSec;
          c.vy += (dy / dist) * 10 * dtSec;
        }
      }
    }

    // Cloud-cloud collision (allow 30% overlap)
    const cloudRadius = PIECE_SIZE * 0.45;
    const minCloudDist = cloudRadius * 2 * 1.4; // doubled bump radius
    for (let j = 0; j < state.clouds.length; j++) {
      if (i === j) continue;
      const other = state.clouds[j];
      const cdx = c.x - other.x;
      const cdy = c.y - other.y;
      const cdist = Math.hypot(cdx, cdy);
      if (cdist < minCloudDist && cdist > 0.1) {
        const overlap = (minCloudDist - cdist) / minCloudDist;
        c.vx += (cdx / cdist) * overlap * 15 * dtSec;
        c.vy += (cdy / cdist) * overlap * 15 * dtSec;
      }
    }

    c.vx *= Math.pow(0.97, dtSec * 60);
    c.vy *= Math.pow(0.97, dtSec * 60);
    c.x += c.vx * dtSec;
    c.y += c.vy * dtSec;
  }

  // Fire transition callbacks for clouds that finished exit animation
  for (let i = state.clouds.length - 1; i >= 0; i--) {
    const c = state.clouds[i];
    if (c.transitionOut && c.onTransitionDone) {
      const elapsed = state.time - c.transitionStart;
      if (elapsed >= c.transitionDuration) {
        c.onTransitionDone(c, state);
      }
    }
  }

  // Rain system — only once the island is large enough.
  // A cloud cluster rains when its cloud count > islandMass / 8. When it
  // triggers, a random ceil(islandMass / 12) of its clouds (capped at the
  // cluster size) are tagged 'raining', each with a random 0–10s countdown.
  // When a raining cloud's timer elapses it shrinks out and is removed; when
  // the last raining cloud of a rain group is removed, a wild loose piece
  // spawns at that group's center. Multiple clusters can rain independently.
  const islandMass = Object.keys(state.grid).length;
  if (islandMass > 50 && state.clouds.length >= 1) {
    if (!state.rainGroupSeq) state.rainGroupSeq = 1;
    if (!state.rainGroups) state.rainGroups = {};

    const used = new Set();
    for (let i = 0; i < state.clouds.length; i++) {
      if (used.has(i)) continue;
      const cluster = [i];
      used.add(i);
      const queue = [i];
      while (queue.length > 0) {
        const ci = queue.shift();
        for (let j = 0; j < state.clouds.length; j++) {
          if (used.has(j)) continue;
          const d = Math.hypot(
            state.clouds[ci].x - state.clouds[j].x,
            state.clouds[ci].y - state.clouds[j].y
          );
          if (d < PIECE_SIZE * 1.5) {
            cluster.push(j);
            used.add(j);
            queue.push(j);
          }
        }
      }

      const alreadyRaining = cluster.some(idx => state.clouds[idx].raining);
      if (cluster.length > islandMass / 8 && !alreadyRaining) {
        const count = Math.min(cluster.length, Math.ceil(islandMass / 12));
        const pool = cluster.slice();
        const groupId = state.rainGroupSeq++;
        let cx = 0, cy = 0;
        for (const idx of cluster) { cx += state.clouds[idx].x; cy += state.clouds[idx].y; }
        cx /= cluster.length; cy /= cluster.length;
        state.rainGroups[groupId] = { center: { x: cx, y: cy }, remaining: count };
        for (let k = 0; k < count; k++) {
          const r = Math.floor(Math.random() * pool.length);
          const cloud = state.clouds[pool.splice(r, 1)[0]];
          cloud.raining = true;
          cloud.rainGroupId = groupId;
          cloud.rainTimer = Math.random() * 10000;
        }
      }
    }
  }

  // Tick raining clouds: count down, then shrink out when their timer elapses
  for (let i = 0; i < state.clouds.length; i++) {
    const c = state.clouds[i];
    if (!c.raining || c.transitionOut) continue;
    c.rainTimer -= dtSec * 1000;
    if (c.rainTimer <= 0) {
      c.transitionOut = true;
      c.transitionStart = state.time;
      c.transitionDuration = 500;
      const groupId = c.rainGroupId;
      c.onTransitionDone = (cloud, st) => {
        const idx = st.clouds.indexOf(cloud);
        if (idx >= 0) st.clouds.splice(idx, 1);
        const group = st.rainGroups && st.rainGroups[groupId];
        if (group) {
          group.remaining -= 1;
          if (group.remaining <= 0) {
            spawnWildPiece(st, group.center.x, group.center.y);
            delete st.rainGroups[groupId];
          }
        }
      };
    }
  }
}

// Spawn a wild loose piece at (x, y). Wild pieces drift like normal pieces
// but never auto-snap; they morph color and sides while floating freely, and
// can be placed anywhere via drag-and-release.
function spawnWildPiece(state, x, y) {
  state.loosePieces.push({
    x, y,
    sides: generateRandomSides(),
    vx: 0, vy: 0,
    isWild: true,
    wildMorphTimer: 0,
    hasBeenInWater: false,
    justSpawned: true,
  });
}

// Place a piece onto the grid
export function placePiece(state, piece, gx, gy) {
  const key = `${gx},${gy}`;
  state.grid[key] = { sides: piece.sides, elevation: 0 };
  playKnockSound();
  runPromotions(state.grid, state.time);
}
