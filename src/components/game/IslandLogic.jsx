import { PIECE_SIZE } from './BiomeConfig';
import { getNeighborOffset, getOpposite, sidesMatch } from './PieceGeometry';

// Get the 8 Moore neighbors
function getMooreNeighbors(gx, gy) {
  const neighbors = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      neighbors.push({ gx: gx + dx, gy: gy + dy });
    }
  }
  return neighbors;
}

// Calculate elevation for a single grid piece
export function calculateElevation(grid, gx, gy) {
  const neighbors = getMooreNeighbors(gx, gy);
  let count = 0;
  for (const n of neighbors) {
    const key = `${n.gx},${n.gy}`;
    if (grid[key]) count++;
  }
  return count;
}

// Run iterative promotion across the entire grid
export function runPromotions(grid, now) {
  const timestamp = now ?? performance.now();
  const keys = Object.keys(grid);
  // First pass: base elevation
  for (const key of keys) {
    const [gx, gy] = key.split(',').map(Number);
    const newElev = calculateElevation(grid, gx, gy);
    const piece = grid[key];
    if (piece.elevation !== newElev) {
      piece.prevElevation = piece.elevation ?? newElev;
      piece.elevationChangeTime = timestamp;
    }
    piece.elevation = newElev;
  }

  // Iterative promotion
  let changed = true;
  let iterations = 0;
  while (changed && iterations < 30) {
    changed = false;
    iterations++;
    for (const key of keys) {
      const piece = grid[key];
      const [gx, gy] = key.split(',').map(Number);
      const neighbors = getMooreNeighbors(gx, gy);
      const level = piece.elevation;

      // Check if all 8 neighbors exist and are >= level
      let allAtLevel = true;
      for (const n of neighbors) {
        const nk = `${n.gx},${n.gy}`;
        if (!grid[nk] || grid[nk].elevation < level) {
          allAtLevel = false;
          break;
        }
      }
      if (allAtLevel && neighbors.length === 8) {
        const minNeighborLevel = Math.min(...neighbors.map(n => grid[`${n.gx},${n.gy}`]?.elevation || 0));
        if (piece.elevation < minNeighborLevel + 1) {
          piece.prevElevation = piece.elevation;
          piece.elevationChangeTime = timestamp;
          piece.elevation = minNeighborLevel + 1;
          changed = true;
        }
      }
    }
  }
}

// Find the island's center of mass
export function getIslandCenter(grid) {
  const keys = Object.keys(grid);
  if (keys.length === 0) return { x: 0, y: 0 };
  let sx = 0, sy = 0;
  for (const key of keys) {
    const [gx, gy] = key.split(',').map(Number);
    sx += gx;
    sy += gy;
  }
  return {
    x: (sx / keys.length) * PIECE_SIZE + PIECE_SIZE / 2,
    y: (sy / keys.length) * PIECE_SIZE + PIECE_SIZE / 2,
  };
}

// Find the highest point on the island
export function getIslandPeak(grid) {
  let peak = null;
  let maxElev = -1;
  for (const key in grid) {
    if (grid[key].elevation > maxElev) {
      maxElev = grid[key].elevation;
      const [gx, gy] = key.split(',').map(Number);
      peak = { x: gx * PIECE_SIZE + PIECE_SIZE / 2, y: gy * PIECE_SIZE + PIECE_SIZE / 2 };
    }
  }
  return peak || { x: 0, y: 0 };
}

// Get coast cells (grid cells with at least one empty neighbor in 4 dirs)
export function getCoastCells(grid) {
  const coast = [];
  for (const key in grid) {
    const [gx, gy] = key.split(',').map(Number);
    for (let i = 0; i < 4; i++) {
      const off = getNeighborOffset(i);
      const nk = `${gx + off.dx},${gy + off.dy}`;
      if (!grid[nk]) {
        coast.push({ gx, gy, x: gx * PIECE_SIZE + PIECE_SIZE / 2, y: gy * PIECE_SIZE + PIECE_SIZE / 2 });
        break;
      }
    }
  }
  return coast;
}

// Check if a circle (radius = 0.25 * PIECE_SIZE) centered at wx,wy overlaps any island grid cell.
// Only checks the 2x2 block of cells the circle can possibly touch — very cheap.
export function isOverIsland(grid, wx, wy) {
  const r = PIECE_SIZE * 0.25;
  // Bounding box of the circle in grid coords
  const minGx = Math.floor((wx - r) / PIECE_SIZE);
  const maxGx = Math.floor((wx + r) / PIECE_SIZE);
  const minGy = Math.floor((wy - r) / PIECE_SIZE);
  const maxGy = Math.floor((wy + r) / PIECE_SIZE);

  for (let gx = minGx; gx <= maxGx; gx++) {
    for (let gy = minGy; gy <= maxGy; gy++) {
      if (!grid[`${gx},${gy}`]) continue;
      // Clamp circle center to the cell's AABB, then check distance
      const cellLeft = gx * PIECE_SIZE;
      const cellTop  = gy * PIECE_SIZE;
      const nearX = Math.max(cellLeft, Math.min(wx, cellLeft + PIECE_SIZE));
      const nearY = Math.max(cellTop,  Math.min(wy, cellTop  + PIECE_SIZE));
      if (Math.hypot(wx - nearX, wy - nearY) <= r) return true;
    }
  }
  return false;
}

// Get grid cell under world position
export function getGridCell(wx, wy) {
  return {
    gx: Math.floor(wx / PIECE_SIZE),
    gy: Math.floor(wy / PIECE_SIZE),
  };
}

// Check if a loose piece can snap to any grid position
export function findSnapTarget(grid, wx, wy, sides, wild) {
  // Check all 4-directional neighbors of existing grid pieces
  const candidates = new Set();
  for (const key in grid) {
    const [gx, gy] = key.split(',').map(Number);
    for (let i = 0; i < 4; i++) {
      const off = getNeighborOffset(i);
      const nx = gx + off.dx;
      const ny = gy + off.dy;
      const nk = `${nx},${ny}`;
      if (!grid[nk]) {
        candidates.add(nk);
      }
    }
  }

  let bestDist = Infinity;
  let bestTarget = null;

  for (const candKey of candidates) {
    const [cx, cy] = candKey.split(',').map(Number);
    const centerX = cx * PIECE_SIZE + PIECE_SIZE / 2;
    const centerY = cy * PIECE_SIZE + PIECE_SIZE / 2;
    const dist = Math.hypot(wx - centerX, wy - centerY);

    if (dist > PIECE_SIZE * 0.64) continue;

    // Check that ALL existing neighbors have matching sides (wild pieces fit anywhere)
    let valid = true;
    let hasNeighbor = false;
    for (let i = 0; i < 4; i++) {
      const off = getNeighborOffset(i);
      const nx = cx + off.dx;
      const ny = cy + off.dy;
      const nk = `${nx},${ny}`;
      if (grid[nk]) {
        hasNeighbor = true;
        if (!wild) {
          const oppSide = getOpposite(i);
          if (!sidesMatch(sides[i], grid[nk].sides[oppSide])) {
            valid = false;
            break;
          }
        }
      }
    }

    if (valid && hasNeighbor && dist < bestDist) {
      bestDist = dist;
      bestTarget = { gx: cx, gy: cy };
    }
  }

  return bestTarget;
}

// Like findSnapTarget but with a larger radius for physics-driven auto-snapping
export function findSnapTargetPhysics(grid, wx, wy, sides) {
  const candidates = new Set();
  for (const key in grid) {
    const [gx, gy] = key.split(',').map(Number);
    for (let i = 0; i < 4; i++) {
      const off = getNeighborOffset(i);
      const nx = gx + off.dx;
      const ny = gy + off.dy;
      const nk = `${nx},${ny}`;
      if (!grid[nk]) candidates.add(nk);
    }
  }

  let bestDist = Infinity;
  let bestTarget = null;

  for (const candKey of candidates) {
    const [cx, cy] = candKey.split(',').map(Number);
    const centerX = cx * PIECE_SIZE + PIECE_SIZE / 2;
    const centerY = cy * PIECE_SIZE + PIECE_SIZE / 2;
    const dist = Math.hypot(wx - centerX, wy - centerY);

    // Larger radius for physics snapping (reduced by 15%)
    if (dist > PIECE_SIZE * 1.02) continue;

    let valid = true;
    let hasNeighbor = false;
    for (let i = 0; i < 4; i++) {
      const off = getNeighborOffset(i);
      const nx = cx + off.dx;
      const ny = cy + off.dy;
      const nk = `${nx},${ny}`;
      if (grid[nk]) {
        hasNeighbor = true;
        const oppSide = getOpposite(i);
        if (!sidesMatch(sides[i], grid[nk].sides[oppSide])) {
          valid = false;
          break;
        }
      }
    }

    if (valid && hasNeighbor && dist < bestDist) {
      bestDist = dist;
      bestTarget = { gx: cx, gy: cy };
    }
  }

  return bestTarget;
}

// Count filled Moore neighbors (max 8) around a cell
export function countSurroundingFilled(grid, gx, gy) {
  let count = 0;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      if (grid[`${gx + dx},${gy + dy}`]) count++;
    }
  }
  return count;
}

// Check if an empty grid cell is a "pit" — all 8 Moore neighbors are filled
export function isPit(grid, gx, gy) {
  if (grid[`${gx},${gy}`]) return false; // cell must be empty
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      if (!grid[`${gx + dx},${gy + dy}`]) return false;
    }
  }
  return true;
}

// BFS to find nearest edge from a plateau
export function bfsToEdge(grid, startGx, startGy) {
  const startElev = grid[`${startGx},${startGy}`]?.elevation || 0;
  const visited = new Set();
  const queue = [{ gx: startGx, gy: startGy, path: [] }];
  visited.add(`${startGx},${startGy}`);

  while (queue.length > 0) {
    const { gx, gy, path } = queue.shift();
    for (let i = 0; i < 4; i++) {
      const off = getNeighborOffset(i);
      const nx = gx + off.dx;
      const ny = gy + off.dy;
      const nk = `${nx},${ny}`;
      if (visited.has(nk)) continue;
      visited.add(nk);

      if (!grid[nk]) {
        // Found water edge
        return { dx: off.dx, dy: off.dy };
      }
      if (grid[nk].elevation < startElev) {
        return { dx: off.dx, dy: off.dy };
      }
      queue.push({ gx: nx, gy: ny, path: [...path, { dx: off.dx, dy: off.dy }] });
    }
  }
  return { dx: 0, dy: 0 };
}