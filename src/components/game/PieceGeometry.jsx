import { PIECE_SIZE, TAB_SIZE } from './BiomeConfig';

// Sides: 0=top, 1=right, 2=bottom, 3=left
// Values: 1=tab, -1=slot, 0=none

export function generateRandomSides() {
  const sides = [];
  for (let i = 0; i < 4; i++) {
    const r = Math.random();
    if (r < 0.4) sides.push(1);
    else if (r < 0.8) sides.push(-1);
    else sides.push(0);
  }
  return sides;
}

export function sidesMatch(sideA, sideB) {
  // Tab(1) + Slot(-1) = match, or both None(0)
  if (sideA === 0 && sideB === 0) return true;
  return sideA + sideB === 0 && sideA !== 0;
}

export function getOpposite(sideIndex) {
  return (sideIndex + 2) % 4;
}

export function getNeighborOffset(sideIndex) {
  // 0=top, 1=right, 2=bottom, 3=left
  const offsets = [
    { dx: 0, dy: -1 }, // top
    { dx: 1, dy: 0 },  // right
    { dx: 0, dy: 1 },  // bottom
    { dx: -1, dy: 0 }, // left
  ];
  return offsets[sideIndex];
}

// Draw a jigsaw piece path on canvas
export function drawPiecePath(ctx, x, y, sides, size = PIECE_SIZE) {
  const s = size;
  const tab = TAB_SIZE;
  const half = s / 2;

  ctx.beginPath();

  // Top side
  ctx.moveTo(x, y);
  if (sides[0] !== 0) {
    ctx.lineTo(x + half - tab, y);
    if (sides[0] === 1) {
      // Tab outward
      ctx.quadraticCurveTo(x + half - tab, y - tab * 1.2, x + half, y - tab * 1.4);
      ctx.quadraticCurveTo(x + half + tab, y - tab * 1.2, x + half + tab, y);
    } else {
      // Slot inward
      ctx.quadraticCurveTo(x + half - tab, y + tab * 1.2, x + half, y + tab * 1.4);
      ctx.quadraticCurveTo(x + half + tab, y + tab * 1.2, x + half + tab, y);
    }
    ctx.lineTo(x + s, y);
  } else {
    ctx.lineTo(x + s, y);
  }

  // Right side
  if (sides[1] !== 0) {
    ctx.lineTo(x + s, y + half - tab);
    if (sides[1] === 1) {
      ctx.quadraticCurveTo(x + s + tab * 1.2, y + half - tab, x + s + tab * 1.4, y + half);
      ctx.quadraticCurveTo(x + s + tab * 1.2, y + half + tab, x + s, y + half + tab);
    } else {
      ctx.quadraticCurveTo(x + s - tab * 1.2, y + half - tab, x + s - tab * 1.4, y + half);
      ctx.quadraticCurveTo(x + s - tab * 1.2, y + half + tab, x + s, y + half + tab);
    }
    ctx.lineTo(x + s, y + s);
  } else {
    ctx.lineTo(x + s, y + s);
  }

  // Bottom side
  if (sides[2] !== 0) {
    ctx.lineTo(x + half + tab, y + s);
    if (sides[2] === 1) {
      ctx.quadraticCurveTo(x + half + tab, y + s + tab * 1.2, x + half, y + s + tab * 1.4);
      ctx.quadraticCurveTo(x + half - tab, y + s + tab * 1.2, x + half - tab, y + s);
    } else {
      ctx.quadraticCurveTo(x + half + tab, y + s - tab * 1.2, x + half, y + s - tab * 1.4);
      ctx.quadraticCurveTo(x + half - tab, y + s - tab * 1.2, x + half - tab, y + s);
    }
    ctx.lineTo(x, y + s);
  } else {
    ctx.lineTo(x, y + s);
  }

  // Left side
  if (sides[3] !== 0) {
    ctx.lineTo(x, y + half + tab);
    if (sides[3] === 1) {
      ctx.quadraticCurveTo(x - tab * 1.2, y + half + tab, x - tab * 1.4, y + half);
      ctx.quadraticCurveTo(x - tab * 1.2, y + half - tab, x, y + half - tab);
    } else {
      ctx.quadraticCurveTo(x + tab * 1.2, y + half + tab, x + tab * 1.4, y + half);
      ctx.quadraticCurveTo(x + tab * 1.2, y + half - tab, x, y + half - tab);
    }
    ctx.lineTo(x, y);
  } else {
    ctx.lineTo(x, y);
  }

  ctx.closePath();
}