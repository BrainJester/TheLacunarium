import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { LACUNARIUM_CONFIG as C, towerLayout } from './LacunariumConfig';
import { buildLacunariumScene } from './lacunariumScene';
import { ALL_ROOMS, getFloorRooms } from '../../lib/rooms';

export default function Lacunarium3D() {
  const mountRef = useRef(null), navigate = useNavigate();
  const [floor, setFloor] = useState(0), [slot, setSlot] = useState(0);
  const [error, setError] = useState(''), [attempt, setAttempt] = useState(0), [notice, setNotice] = useState('');
  const target = useRef({ floor: 0, slots: {} });
  const invalidateRef = useRef(() => {});
  const chooseFloor = useCallback(next => {
    const f = Math.max(0, Math.min(1000000, next)); target.current.floor = f;
    setFloor(f); setSlot(target.current.slots[f] || 0); setNotice(''); invalidateRef.current();
  }, []);
  const turn = useCallback((direction, f = target.current.floor) => { target.current.slots[f] = (target.current.slots[f] || 0) + direction;
    if (f === target.current.floor) setSlot(target.current.slots[f]); setNotice(''); invalidateRef.current();
  }, []);
  const enter = useCallback(room => {
    if (room.floor != null) chooseFloor(room.floor);
    else if (room.route) navigate(room.route);
    else setNotice('This room is waiting for a new creation.');
  }, [navigate, chooseFloor]);

  useEffect(() => {
    const mount = mountRef.current;
    let renderer, sceneParts, frame = 0, observer, closed = false, previous = 0;
    let easedFloor = target.current.floor;
    const rotations = {};
    let angle = 2 * Math.PI / C.doorsPerRing, sceneConfig = C, layoutKey;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const coarse = matchMedia('(pointer: coarse)');
    const scene = new THREE.Scene(); scene.background = new THREE.Color(C.background);
    const camera = new THREE.PerspectiveCamera(C.cameraFov, 1, 0.1, 1000);
    let compact;
    const rotationAt = f => rotations[f] ?? 0;
    function requestFrame() { if (!closed && !document.hidden && !frame) frame = requestAnimationFrame(render); }
    function render(time) {
      frame = 0;
      const dt = previous ? Math.min((time - previous) / 1000, 0.05) : 1 / 60; previous = time;
      const factor = motion.matches ? 1 : 1 - Math.exp(-12 * dt);
      easedFloor += (target.current.floor - easedFloor) * factor;
      if (Math.abs(easedFloor - target.current.floor) < 0.001) easedFloor = target.current.floor;
      let moving = easedFloor !== target.current.floor;
      for (let f = Math.max(0, Math.floor(easedFloor) - 2); f <= Math.floor(easedFloor) + 2; f++) {
        const goal = (target.current.slots[f] || 0) * angle, current = rotationAt(f);
        rotations[f] = Math.abs(goal - current) < 0.001 ? goal : current + (goal - current) * factor;
        moving ||= rotations[f] !== goal;
      }
      sceneParts.updateScene(easedFloor, rotationAt); renderer.render(scene, camera);
      if (moving) requestFrame();
    }
    function resize() {
      const w = mount.clientWidth, h = mount.clientHeight, layout = towerLayout(w, h, coarse.matches);
      const nextKey = `${layout.compact}:${layout.config.roomHeight}`;
      if (layoutKey !== nextKey) {
        sceneParts?.dispose(); compact = layout.compact; sceneConfig = layout.config; layoutKey = nextKey;
        angle = 2 * Math.PI / sceneConfig.doorsPerRing;
        for (const f of Object.keys(rotations)) rotations[f] = (target.current.slots[f] || 0) * angle;
        sceneParts = buildLacunariumScene(scene, { compact, config: sceneConfig, invalidate: requestFrame });
        mount.parentElement.classList.toggle('tower-compact', compact);
      }
      camera.aspect = layout.aspect; camera.position.set(0, layout.cameraY, C.radius - layout.distance); camera.lookAt(0, layout.cameraY, C.radius); camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, compact ? 1.5 : 2)); renderer.setSize(w, h); requestFrame();
    }
    let start = null;
    function hitAt(event) {
      const box = renderer.domElement.getBoundingClientRect();
      const pointer = new THREE.Vector2((event.clientX - box.left) / box.width * 2 - 1, -(event.clientY - box.top) / box.height * 2 + 1);
      const ray = new THREE.Raycaster(); ray.setFromCamera(pointer, camera);
      return ray.intersectObjects(sceneParts.root.children, true)[0];
    }
    const down = event => {
      if (!event.isPrimary) return;
      const hit = hitAt(event);
      let object = hit?.object, touchedFloor;
      while (object && touchedFloor == null) { touchedFloor = object.userData.floor; object = object.parent; }
      // Wall gaps use the projected wall height, so a swipe belongs to its row.
      if (touchedFloor == null && hit) touchedFloor = Math.round(easedFloor + hit.point.y / sceneConfig.floorSpacing);
      start = { x: event.clientX, y: event.clientY, id: event.pointerId, floor: Math.max(0, touchedFloor ?? target.current.floor) };
      renderer.domElement.setPointerCapture(event.pointerId);
    };
    const cancel = () => { start = null; };
    const up = event => {
      if (!start || start.id !== event.pointerId) return;
      const dx = event.clientX - start.x, dy = event.clientY - start.y, touchedFloor = start.floor; start = null;
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 40) chooseFloor(target.current.floor + (dy > 0 ? 1 : -1));
      else if (Math.abs(dx) > 40) turn(dx < 0 ? 1 : -1, touchedFloor);
      else if (Math.hypot(dx, dy) < 8) {
        const first = hitAt(event);
        if (first?.object.userData.isDoor) enter(first.object.userData.room);
      }
    };
    const contextLost = event => { event.preventDefault(); setError('The 3D view paused. Reopen it or enter a room below.'); };
    const visibility = () => { previous = 0; if (document.hidden && frame) { cancelAnimationFrame(frame); frame = 0; } else requestFrame(); };
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.domElement.setAttribute('aria-label', 'Lacunarium storefronts. Swipe sideways on a floor to turn its rooms; swipe vertically to change floors. Tap a room to enter.');
      mount.appendChild(renderer.domElement); observer = new ResizeObserver(resize); observer.observe(mount); resize();
      renderer.domElement.addEventListener('pointerdown', down); renderer.domElement.addEventListener('pointerup', up);
      renderer.domElement.addEventListener('pointercancel', cancel); renderer.domElement.addEventListener('webglcontextlost', contextLost);
      document.addEventListener('visibilitychange', visibility); coarse.addEventListener('change', resize); invalidateRef.current = requestFrame;
    } catch { setError('The 3D view is unavailable on this device. Your rooms are still available below.'); }
    return () => {
      closed = true; cancelAnimationFrame(frame); observer?.disconnect(); sceneParts?.dispose();
      document.removeEventListener('visibilitychange', visibility); coarse.removeEventListener('change', resize); invalidateRef.current = () => {};
      if (renderer) { renderer.domElement.removeEventListener('pointerdown', down); renderer.domElement.removeEventListener('pointerup', up); renderer.domElement.removeEventListener('pointercancel', cancel); renderer.domElement.removeEventListener('webglcontextlost', contextLost); renderer.dispose(); renderer.domElement.remove(); }
    };
  }, [attempt, chooseFloor, turn, enter]);
  const rooms = getFloorRooms(floor), room = rooms[((slot % rooms.length) + rooms.length) % rooms.length];
  return <div className="tower" tabIndex={0} aria-label="Explore the Lacunarium" onKeyDown={event => {
    if (event.target instanceof HTMLButtonElement || event.target instanceof HTMLAnchorElement) return;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) event.preventDefault();
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); enter(room); }
    if (event.key === 'ArrowLeft') turn(-1); if (event.key === 'ArrowRight') turn(1);
    if (event.key === 'ArrowUp') chooseFloor(floor + 1); if (event.key === 'ArrowDown') chooseFloor(floor - 1);
  }}>
    <div className="tower-scene" ref={mountRef} />
    {error && <div className="tower-error" role="alert"><p>{error}</p><button onClick={() => { setError(''); setAttempt(n => n + 1); }}>Reopen 3D view</button></div>}
    <nav className="tower-compass" aria-label="Room and floor navigation">
      <button className="compass-north" onClick={() => chooseFloor(floor + 1)} aria-label="Ascend floor"><ArrowUp /></button>
      <button className="compass-west" onClick={() => turn(-1)} aria-label="Previous room"><ChevronLeft /></button>
      <span className="compass-center" aria-label={`Floor ${floor + 1}`} aria-live="polite">{String(floor + 1).padStart(2, '0')}</span>
      <button className="compass-east" onClick={() => turn(1)} aria-label="Next room"><ChevronRight /></button>
      <button className="compass-south" onClick={() => chooseFloor(floor - 1)} disabled={floor === 0} aria-label="Descend floor"><ArrowDown /></button>
    </nav>
    <p className="sr-only" aria-live="polite">{room.label}. Press Enter to enter this room. {notice}</p>
    {notice && <p className="tower-notice" role="status">{notice}</p>}
    {error && <nav className="tower-fallback" aria-label="All rooms">{ALL_ROOMS.map(r => <Link key={r.id} to={r.route}>{r.label}</Link>)}</nav>}

  </div>;
}
