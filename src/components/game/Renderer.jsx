import { PIECE_SIZE } from './BiomeConfig';
import { getBiomeColor, getCellColorNoise } from './BiomeConfig';
import { drawPiecePath } from './PieceGeometry';

// Parse a css color string like 'rgb(r,g,b)' or '#rrggbb' into [r,g,b]
function parseColor(color) {
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    return [
      parseInt(hex.slice(0,2), 16),
      parseInt(hex.slice(2,4), 16),
      parseInt(hex.slice(4,6), 16),
    ];
  }
  const m = color.match(/\d+/g);
  return m ? [+m[0], +m[1], +m[2]] : [0, 0, 0];
}

function lerpColor(a, b, t) {
  const [r1,g1,b1] = parseColor(a);
  const [r2,g2,b2] = parseColor(b);
  return `rgb(${Math.round(r1+(r2-r1)*t)},${Math.round(g1+(g2-g1)*t)},${Math.round(b1+(b2-b1)*t)})`;
}

export function renderGame(ctx, canvas, state, camera, time, hoveredPiece) {
  const w = canvas.width;
  const h = canvas.height;

  // Draw animated water background
  drawBackground(ctx, w, h, time, camera);

  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);

  // Draw grid pieces (island)
  drawIsland(ctx, state.grid, time);

  // Draw loose pieces
  drawLoosePieces(ctx, state.loosePieces, time, hoveredPiece);

  // Draw clouds (on top)
  drawClouds(ctx, state.clouds, time);

  ctx.restore();
}

function drawBackground(ctx, w, h, time, camera) {
  // Tile size — halved from 80 to 40
  const TILE = 40;

  // Apply camera transform so background pans/zooms with the island
  const zoom = camera.zoom;
  const scaledTile = TILE * zoom;

  // Offset in screen space: world origin maps to (w/2 - camera.x*zoom, h/2 - camera.y*zoom)
  const originX = w / 2 - camera.x * zoom;
  const originY = h / 2 - camera.y * zoom;

  // Start tile just off the left/top edge
  const startCol = Math.floor(-originX / scaledTile) - 1;
  const startRow = Math.floor(-originY / scaledTile) - 1;
  const cols = Math.ceil(w / scaledTile) + 2;
  const rows = Math.ceil(h / scaledTile) + 2;

  const t = time * 0.0001;

  // Darken color range by 15% (multiply hex values by 0.85)
  const r0 = Math.round(0x1C * 0.85); // dark end
  const r1 = Math.round(0x30 * 0.85); // light end
  const g0 = Math.round(0x4E * 0.85);
  const g1 = Math.round(0x88 * 0.85);
  const b0 = Math.round(0x9E * 0.85);
  const b1 = Math.round(0xE0 * 0.85);

  for (let row = startRow; row < startRow + rows; row++) {
    for (let col = startCol; col < startCol + cols; col++) {
      // World-space position of this tile (in world units)
      const wx = col * TILE;
      const wy = row * TILE;

      // Use world coords for UV so waves stay fixed to world space
      const u = wx / (w / zoom);
      const v = wy / (h / zoom);

      const wave =
        Math.sin(u * 6.2 + t * 1.3) * 0.18 +
        Math.sin(v * 5.1 + t * 0.9) * 0.15 +
        Math.sin((u + v) * 4.4 + t * 0.7) * 0.12 +
        Math.sin((u - v) * 3.7 + t * 1.1) * 0.10;

      const fade = (wave + 0.55) / 1.1;
      const c = Math.max(0, Math.min(1, fade));

      const r = Math.round(r0 + (r1 - r0) * c);
      const g = Math.round(g0 + (g1 - g0) * c);
      const b = Math.round(b0 + (b1 - b0) * c);

      // Screen position
      const sx = originX + col * scaledTile;
      const sy = originY + row * scaledTile;

      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(sx, sy, scaledTile + 0.5, scaledTile + 0.5);
    }
  }
}

function drawCoastalFoam(ctx, grid, time) {
  const MAX_FOAM = PIECE_SIZE * 0.28;
  const STEPS = 24; // segments along each edge for smooth curve following

  const dirs = [
    { dx: 0, dy: -1, side: 'top' },
    { dx: 1,  dy: 0, side: 'right' },
    { dx: 0,  dy: 1, side: 'bottom' },
    { dx: -1, dy: 0, side: 'left' },
  ];

  // For each exposed edge, sample STEPS points along the piece's jigsaw edge
  // and build an outward polygon that follows the tab/slot curve.
  for (const key in grid) {
    const [gx, gy] = key.split(',').map(Number);
    const piece = grid[key];
    const px = gx * PIECE_SIZE;
    const py = gy * PIECE_SIZE;

    for (let d = 0; d < 4; d++) {
      const { dx, dy, side } = dirs[d];
      const nk = `${gx + dx},${gy + dy}`;
      if (grid[nk]) continue;

      // Check corners — are the diagonal-adjacent cells also open?
      // Used to determine if we should extend/curl around this corner.
      const hasLeft  = d === 0 ? !!grid[`${gx-1},${gy}`] : d === 1 ? !!grid[`${gx},${gy-1}`] : d === 2 ? !!grid[`${gx-1},${gy}`] : !!grid[`${gx},${gy-1}`];
      const hasRight = d === 0 ? !!grid[`${gx+1},${gy}`] : d === 1 ? !!grid[`${gx},${gy+1}`] : d === 2 ? !!grid[`${gx+1},${gy}`] : !!grid[`${gx},${gy+1}`];

      // Phase offset per edge for varied timing
      const phase = gx * 0.55 + gy * 0.55 + d * 1.4;
      // Ebb/flow: width breathes in and out
      const ebb = (Math.sin(time * 0.0014 + phase) + 1) / 2;        // 0–1
      const foamW = MAX_FOAM * (0.35 + 0.65 * ebb);
      // Color wave
      const colorWave = (Math.sin(time * 0.002 + phase + 1.0) + 1) / 2;
      const gCh = Math.round(235 + colorWave * 20);
      const bCh = Math.round(215 + colorWave * 40);
      const peakAlpha = 0.5 + colorWave * 0.35;

      // Sample points along this piece edge in world space.
      // We use a tiny offscreen path trick: stroke the edge path and sample t in [0,1].
      // Instead, we compute analytically: for each side, the "inner" edge follows
      // the jigsaw tabs, and the outer edge is offset outward by foamW.

      // Get the inner edge points by sampling getEdgePoint(side, t, piece.sides[d])
      const innerPts = [];
      const outerPts = [];

      // Extend slightly past corners based on neighbors
      const tStart = hasLeft  ? -0.12 : 0;
      const tEnd   = hasRight ?  1.12 : 1;

      for (let s = 0; s <= STEPS; s++) {
        const t = tStart + (s / STEPS) * (tEnd - tStart);
        const { x, y, nx: nx_, ny: ny_ } = sampleEdge(px, py, side, t, piece.sides[d]);
        innerPts.push({ x, y });
        outerPts.push({ x: x + nx_ * foamW, y: y + ny_ * foamW });
      }

      // Build gradient perpendicular to edge direction (outward fade)
      let gx0, gy0, gx1, gy1;
      const mid = innerPts[Math.floor(innerPts.length / 2)];
      const norm = getEdgeNormal(side);
      gx0 = mid.x;
      gy0 = mid.y;
      gx1 = mid.x + norm.nx * foamW;
      gy1 = mid.y + norm.ny * foamW;

      const grad = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
      grad.addColorStop(0,   `rgba(255,${gCh},${bCh},${peakAlpha})`);
      grad.addColorStop(0.4, `rgba(255,${gCh},${bCh},${peakAlpha * 0.6})`);
      grad.addColorStop(1,   `rgba(255,${gCh},${bCh},0)`);

      // Draw the foam polygon
      ctx.beginPath();
      ctx.moveTo(innerPts[0].x, innerPts[0].y);
      for (let s = 1; s < innerPts.length; s++) {
        ctx.lineTo(innerPts[s].x, innerPts[s].y);
      }
      for (let s = outerPts.length - 1; s >= 0; s--) {
        ctx.lineTo(outerPts[s].x, outerPts[s].y);
      }
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    }
  }
}

// Returns outward normal for a given side
function getEdgeNormal(side) {
  if (side === 'top')    return { nx: 0,  ny: -1 };
  if (side === 'bottom') return { nx: 0,  ny:  1 };
  if (side === 'left')   return { nx: -1, ny:  0 };
  return                        { nx:  1, ny:  0 };
}

// Sample a point along a piece edge at parameter t (0=start corner, 1=end corner).
// Returns world {x, y} and outward normal {nx, ny}.
// The jigsaw tab/slot is a quadratic bump at t=0.5 using the piece's side type.
function sampleEdge(px, py, side, t, sideType) {
  // Tab protrudes outward, slot inward, flat is straight.
  // We model the edge as a quadratic bezier:
  //   P0 = start corner, P2 = end corner, P1 = midpoint offset outward (tab) or inward (slot)
  const TAB_H = PIECE_SIZE * 0.18;
  const bulge = sideType === 'tab' ? TAB_H : sideType === 'slot' ? -TAB_H : 0;

  let x0, y0, x2, y2, cx, cy;
  const norm = getEdgeNormal(side);

  if (side === 'top') {
    x0 = px;             y0 = py;
    x2 = px + PIECE_SIZE; y2 = py;
  } else if (side === 'bottom') {
    x0 = px;             y0 = py + PIECE_SIZE;
    x2 = px + PIECE_SIZE; y2 = py + PIECE_SIZE;
  } else if (side === 'left') {
    x0 = px; y0 = py;
    x2 = px; y2 = py + PIECE_SIZE;
  } else {
    x0 = px + PIECE_SIZE; y0 = py;
    x2 = px + PIECE_SIZE; y2 = py + PIECE_SIZE;
  }

  // Control point: midpoint of the straight edge + outward bulge
  cx = (x0 + x2) / 2 + norm.nx * bulge;
  cy = (y0 + y2) / 2 + norm.ny * bulge;

  // Clamp t into [0,1] for bezier but allow slight overshoot for corner curl
  const tc = Math.max(0, Math.min(1, t));
  const bx = (1-tc)*(1-tc)*x0 + 2*(1-tc)*tc*cx + tc*tc*x2;
  const by = (1-tc)*(1-tc)*y0 + 2*(1-tc)*tc*cy + tc*tc*y2;

  // Tangent for normal
  const tx_ = 2*(1-tc)*(cx-x0) + 2*tc*(x2-cx);
  const ty_ = 2*(1-tc)*(cy-y0) + 2*tc*(y2-cy);
  const tlen = Math.hypot(tx_, ty_) || 1;
  // Outward normal = rotate tangent 90° in the outward direction
  // For top/bottom edges outward is -y/+y; for left/right it's -x/+x
  // Simply use the precomputed norm for simplicity (good enough for mostly-straight edges)

  return { x: bx, y: by, nx: norm.nx, ny: norm.ny };
}

function applyNoise(color, noise, amount) {
  const [r, g, b] = parseColor(color);
  const delta = Math.round(noise * amount);
  return `rgb(${Math.max(0,Math.min(255,r+delta))},${Math.max(0,Math.min(255,g+delta))},${Math.max(0,Math.min(255,b+delta))})`;
}

function getBiomeIndex(elevation) {
  if (elevation <= 7) return 0; // beach
  if (elevation <= 10) return 1; // forest
  if (elevation <= 16) return 2; // mountain
  return 3; // lava
}

function getAdjacentBiomeColor(elevation, time) {
  // Return color of the neighboring biome if on the edge, else null
  if (elevation === 7) return getBiomeColor(8, time);   // beach→forest edge
  if (elevation === 8) return getBiomeColor(7, time);   // forest→beach edge
  if (elevation === 10) return getBiomeColor(11, time); // forest→mountain edge
  if (elevation === 11) return getBiomeColor(10, time); // mountain→forest edge
  if (elevation === 16) return getBiomeColor(17, time); // mountain→lava edge
  if (elevation === 17) return getBiomeColor(16, time); // lava→mountain edge
  return null;
}

function drawIsland(ctx, grid, time) {
  for (const key in grid) {
    const [gx, gy] = key.split(',').map(Number);
    const piece = grid[key];
    const x = gx * PIECE_SIZE;
    const y = gy * PIECE_SIZE;

    let color = getBiomeColor(piece.elevation, time);
    // Lerp from previous color if elevation changed recently
    if (piece.elevationChangeTime != null && piece.prevElevation != null) {
      const elapsed = time - piece.elevationChangeTime;
      const t = Math.min(1, elapsed / 500);
      if (t < 1) {
        const fromColor = getBiomeColor(piece.prevElevation, time);
        color = lerpColor(fromColor, color, t);
      }
    }

    // 25% chance to use adjacent biome color on biome edges
    const adjacentColor = getAdjacentBiomeColor(piece.elevation, time);
    if (adjacentColor) {
      // Use a stable per-cell random based on position
      const rand = (Math.sin(gx * 73.1 + gy * 197.9) * 43758.5453) % 1;
      const r = Math.abs(rand);
      if (r < 0.25) color = adjacentColor;
    }

    // Apply stable per-cell color noise (±12 RGB)
    const noise = getCellColorNoise(gx, gy);
    color = applyNoise(color, noise, 12);

    drawPiecePath(ctx, x, y, piece.sides);
    ctx.fillStyle = color;
    ctx.fill();

    // Subtle inner glow
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }
}

function getTransitionScale(obj, time) {
  if (obj.transitionOut) {
    const t = Math.min(1, (time - obj.transitionStart) / obj.transitionDuration);
    return { scale: 1 - t, alpha: 1 - t };
  }
  if (obj.transitionIn) {
    const t = Math.min(1, (time - obj.transitionStart) / obj.transitionDuration);
    if (t >= 1) { obj.transitionIn = false; }
    return { scale: t, alpha: t };
  }
  return { scale: 1, alpha: 1 };
}

function drawLoosePieces(ctx, pieces, time, hoveredPiece) {
  for (const p of pieces) {
    const pulse = Math.sin(time * 0.003 + p.x * 0.01) * 0.1;
    const baseAlpha = 0.8 + pulse * 0.2;
    const isHovered = p === hoveredPiece;
    const { scale, alpha: transAlpha } = getTransitionScale(p, time);
    const alpha = baseAlpha * transAlpha;
    const hl = p.pitHighlightLevel || 0;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(scale, scale);
    ctx.translate(-p.x, -p.y);

    drawPiecePath(ctx, p.x - PIECE_SIZE / 2, p.y - PIECE_SIZE / 2, p.sides);

    if (p.isWild) {
      // Wild pieces glow with a cycling rainbow fill
      const hue = (time * 0.15 + p.x * 0.05 + p.y * 0.05) % 360;
      ctx.fillStyle = `hsla(${hue}, 100%, 60%, ${alpha})`;
      ctx.fill();
    } else {
      // Fade between background #1C4E9E and #3088E0, blended toward white by highlight
      const fade = (Math.sin(time * 0.001 + p.x * 0.01 + p.y * 0.01) + 1) / 2;
      const r = Math.round(0x1C + (0x30 - 0x1C) * fade);
      const g = Math.round(0x4E + (0x88 - 0x4E) * fade);
      const b = Math.round(0x9E + (0xE0 - 0x9E) * fade);
      const fr = Math.round(r + (255 - r) * hl);
      const fg = Math.round(g + (255 - g) * hl);
      const fb = Math.round(b + (255 - b) * hl);
      ctx.fillStyle = `rgba(${fr}, ${fg}, ${fb}, ${alpha * (0.75 + 0.15 * hl)})`;
      ctx.fill();
    }

    // Always draw thin white outline; thicker on hover or highlighted
    const emphasis = Math.max(isHovered ? 1 : 0, hl);
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.27 + 0.53 * emphasis})`;
    ctx.lineWidth = 1.34 + 0.66 * emphasis;
    ctx.stroke();
    ctx.restore();
  }
}

function drawClouds(ctx, clouds, time) {
  for (const c of clouds) {
    const wobble = Math.sin(time * 0.001 + c.x * 0.005) * 5;
    const size = PIECE_SIZE * 0.9;
    const { scale, alpha: transAlpha } = getTransitionScale(c, time);

    ctx.save();
    ctx.globalAlpha = 0.25 * transAlpha;
    ctx.translate(c.x + wobble, c.y);
    ctx.scale(scale, scale);
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.restore();
  }
}