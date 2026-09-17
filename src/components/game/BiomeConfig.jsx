// Elevation-based biome colors (0 = lone/coast piece)
export const BIOME_COLORS = [
  // 0-7: Beach (sandy shades)
  '#c2a96e', '#c8b076', '#ceb880', '#d4be82', '#d8c48a', '#dcc890', '#e0cc96', '#e4d09c',
  // 8-10: Forest (greens)
  '#2d6e3f', '#358548', '#3d9c52',
  // 11-16: Mountain (grays/browns)
  '#6b6b6b', '#737068', '#7a7064', '#837860', '#8a7a5e', '#9a8a6a',
  // 17+: Lava (base orange, will pulse)
  '#cc4400',
];

// Per-cell color noise: stable hash from gx,gy → small offset in [-1,1]
export function getCellColorNoise(gx, gy) {
  const h = Math.sin(gx * 127.1 + gy * 311.7) * 43758.5453;
  return (h - Math.floor(h)) * 2 - 1; // -1 to 1
}

export function getBiomeColor(elevation, time) {
  if (elevation >= 17) {
    // Pulsing lava
    const pulse = Math.sin(time * 0.003) * 0.5 + 0.5;
    const r = Math.floor(180 + pulse * 75);
    const g = Math.floor(30 + pulse * 40);
    const b = Math.floor(0 + pulse * 20);
    return `rgb(${r},${g},${b})`;
  }
  const idx = Math.min(elevation, BIOME_COLORS.length - 2);
  return BIOME_COLORS[Math.max(0, idx)];
}

export function getWaterColor(depth, time) {
  const wave = Math.sin(time * 0.001 + depth * 0.5) * 15;
  const r = 8 + wave * 0.2;
  const g = 20 + wave * 0.5;
  const b = 45 + wave;
  return `rgb(${Math.floor(r)},${Math.floor(g)},${Math.floor(b)})`;
}

export const PIECE_SIZE = 100;
export const MAX_LOOSE = 30;
export const SNAP_DISTANCE = 55;
export const TAB_SIZE = 20;