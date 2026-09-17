export { getFloorRooms } from '../../lib/rooms';
export const LACUNARIUM_CONFIG = Object.freeze({
  radius: 64, doorsPerRing: 12, roomWidth: 27, roomHeight: 19,
  floorSpacing: 25, balconyHeight: 2.4, balconyDepth: 3.5,
  poolSize: 7, visibleFloors: 5, pillarRadius: 1.05,
  cameraFov: 48, background: 0xffffff,
});
export function towerLayout(width, height, coarse = false) {
  const aspect = Math.max(0.2, width / Math.max(height, 1));
  const compact = width < 1100 || coarse;
  const visibleWidth = compact ? 30 : 68;
  const distance = Math.max(32, visibleWidth / (2 * aspect * Math.tan(LACUNARIUM_CONFIG.cameraFov * Math.PI / 360)));
  const roomHeight = 15 / aspect;
  const config = compact ? { ...LACUNARIUM_CONFIG, doorsPerRing: 16, roomWidth: 24, roomHeight, floorSpacing: roomHeight * 1.25 } : LACUNARIUM_CONFIG;
  return { compact, distance, aspect, config, cameraY: compact ? roomHeight * 0.23 : 3 };
}
