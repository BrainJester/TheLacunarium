import * as THREE from 'three';
import { LACUNARIUM_CONFIG } from './LacunariumConfig';
import { getFloorRooms } from '../../lib/rooms';

export function buildLacunariumScene(scene, { compact, invalidate, config: C = LACUNARIUM_CONFIG }) {
  const angle = 2 * Math.PI / C.doorsPerRing;
  const resources = new Set();
  const own = resource => { resources.add(resource); return resource; };
  const root = new THREE.Group(); scene.add(root);
  let disposed = false;
  const textures = new Map(), pools = new Map(), loader = new THREE.TextureLoader();
  const material = color => own(new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
  const wallMat = material(0xf4f2ee), balconyMat = material(0xe6e1d8), inkMat = material(0x25231f), pillarMat = material(0xfaf8f3), edgeMat = material(0xbbb5a9);
  const curved = (radius, width, height) => own(new THREE.CylinderGeometry(radius, radius, height, 24, 1, true, -width / radius / 2, width / radius));
  const roomGeo = curved(C.radius, C.roomWidth, C.roomHeight);
  const frameGeo = curved(C.radius + 0.12, C.roomWidth + 0.55, C.roomHeight + 0.55);
  const ledgeGeo = own(new THREE.RingGeometry(C.radius - C.balconyDepth, C.radius + 0.4, 96));
  const railGeo = curved(C.radius - C.balconyDepth, angle * (C.radius - C.balconyDepth) * C.poolSize, C.balconyHeight);
  const trimGeo = curved(C.radius - C.balconyDepth - 0.04, angle * (C.radius - C.balconyDepth) * C.poolSize, 0.15);
  const postGeo = own(new THREE.CylinderGeometry(C.pillarRadius, C.pillarRadius, C.floorSpacing * C.visibleFloors, 12));
  const baseGeo = own(new THREE.CylinderGeometry(C.pillarRadius * 1.3, C.pillarRadius * 1.3, 0.5, 12));
  function labelTexture(label) {
    const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 512;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#faf8f3'; ctx.fillRect(0, 0, 768, 512);
    ctx.strokeStyle = '#b9b2a5'; ctx.lineWidth = 3; ctx.strokeRect(18, 18, 732, 476);
    ctx.fillStyle = '#25231f'; ctx.textAlign = 'center'; ctx.font = 'bold 36px sans-serif'; ctx.fillText(label, 384, 260);
    const texture = own(new THREE.CanvasTexture(canvas)); texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping; texture.repeat.x = -1; texture.offset.x = 1; return texture;
  }
  function textureFor(room) {
    const key = room.url || room.label;
    if (textures.has(key)) return textures.get(key);
    const fallback = labelTexture(room.label); textures.set(key, fallback);
    if (room.url) loader.load(room.url, texture => {
      if (disposed) { texture.dispose(); return; }
      own(texture); texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping; texture.repeat.x = -1; texture.offset.x = 1; textures.set(key, texture);
      for (const pool of pools.values()) for (const door of pool.doors) if (door.room?.url === room.url) { door.mesh.material.map = texture; door.mesh.material.needsUpdate = true; }
      invalidate();
    }, undefined, () => invalidate());
    return fallback;
  }
  function makePool(floor) {
    const group = new THREE.Group(); group.userData.floor = floor; root.add(group);
    const band = new THREE.Mesh(railGeo, balconyMat); band.position.y = C.roomHeight / 2 + C.balconyHeight / 2 + 1.2; group.add(band);
    for (const y of [band.position.y - C.balconyHeight / 2, band.position.y + C.balconyHeight / 2]) { const trim = new THREE.Mesh(trimGeo, inkMat); trim.position.y = y; group.add(trim); }
    const ledge = new THREE.Mesh(ledgeGeo, edgeMat); ledge.rotation.x = Math.PI / 2; ledge.position.y = band.position.y - C.balconyHeight / 2; group.add(ledge);
    const doors = [];
    for (let i = 0; i < C.poolSize; i++) {
      const frame = new THREE.Mesh(frameGeo, inkMat); group.add(frame);
      const mesh = new THREE.Mesh(roomGeo, material(0xffffff)); mesh.userData.isDoor = true; mesh.userData.floor = floor; group.add(mesh);
      doors.push({ mesh, frame, slot: i - 3, room: null });
    }
    const pool = { group, doors }; pools.set(floor, pool); return pool;
  }
  function removePool(floor) { const pool = pools.get(floor); root.remove(pool.group); for (const door of pool.doors) { door.mesh.material.dispose(); resources.delete(door.mesh.material); } pools.delete(floor); }
  root.add(new THREE.Mesh(curved(C.radius + 0.5, Math.PI * C.radius * 1.6, C.floorSpacing * C.visibleFloors), wallMat));
  // A real circular floor follows the storefront radius across the whole view.
  const floorY = -C.roomHeight / 2 - 0.3;
  const floor = new THREE.Mesh(own(new THREE.CircleGeometry(C.radius + 0.5, 160)), material(0xffffff));
  floor.rotation.x = -Math.PI / 2; floor.position.y = floorY; root.add(floor);
  const pillars = [];
  if (!compact) for (let i = 0; i < C.poolSize; i++) { const mesh = new THREE.Mesh(postGeo, pillarMat), base = new THREE.Mesh(baseGeo, edgeMat); root.add(mesh, base); pillars.push({ mesh, base, slot: i - 3 }); }
  function updateScene(easedFloor, rotationAt) {
    const center = Math.floor(easedFloor), first = Math.max(0, center - 2), last = center + 2;
    for (const floor of pools.keys()) if (floor < first || floor > last) removePool(floor);
    for (let floor = first; floor <= last; floor++) {
      const pool = pools.get(floor) || makePool(floor); pool.group.position.y = (floor - easedFloor) * C.floorSpacing;
      const rotation = rotationAt(floor), front = Math.round(rotation / angle), rooms = getFloorRooms(floor);
      for (const door of pool.doors) {
        while (door.slot < front - 3) door.slot += C.poolSize; while (door.slot > front + 3) door.slot -= C.poolSize;
        door.mesh.rotation.y = door.frame.rotation.y = door.slot * angle - rotation;
        const room = rooms[((door.slot % rooms.length) + rooms.length) % rooms.length];
        if (door.room !== room) { door.room = room; door.mesh.userData.room = room; door.mesh.material.map = textureFor(room); door.mesh.material.needsUpdate = true; }
      }
    }
    const rotation = rotationAt(Math.round(easedFloor)), front = Math.round(rotation / angle);
    for (const pillar of pillars) {
      while (pillar.slot < front - 3) pillar.slot += C.poolSize; while (pillar.slot > front + 3) pillar.slot -= C.poolSize;
      const a = (pillar.slot + 0.5) * angle - rotation, radius = C.radius - 4.5;
      pillar.mesh.position.set(Math.sin(a) * radius, floorY + 0.5 + C.floorSpacing * C.visibleFloors / 2, Math.cos(a) * radius);
      pillar.base.position.set(pillar.mesh.position.x, floorY + 0.25, pillar.mesh.position.z);
    }
  }
  function dispose() { disposed = true; scene.remove(root); for (const resource of resources) resource.dispose(); resources.clear(); pools.clear(); }
  return { updateScene, dispose, root };
}
