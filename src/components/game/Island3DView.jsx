import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { PIECE_SIZE, BIOME_COLORS } from './BiomeConfig';

// Map exact 2D biome colors to Three.js colors
const BIOME_COLORS_3D = BIOME_COLORS.map(hex => new THREE.Color(hex));

function getBiomeColor3D(elevation) {
  if (elevation >= 17) {
    // Lava - use the last color
    return new THREE.Color(0xcc4400);
  }
  const idx = Math.min(Math.max(elevation, 0), BIOME_COLORS_3D.length - 2);
  return BIOME_COLORS_3D[idx].clone();
}

export default function Island3DView({ stateRef }) {
  const mountRef = useRef(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    const { grid } = stateRef.current;
    const w = mount.clientWidth;
    const h = mount.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a6fa8);
    // no fog

    // Camera
    const camera = new THREE.PerspectiveCamera(50, w / h, 1, 5000);

    // Find island center
    const keys = Object.keys(grid);
    let sx = 0, sy = 0;
    for (const key of keys) {
      const [gx, gy] = key.split(',').map(Number);
      sx += gx; sy += gy;
    }
    const cx = (sx / keys.length) * PIECE_SIZE + PIECE_SIZE / 2;
    const cy = (sy / keys.length) * PIECE_SIZE + PIECE_SIZE / 2;

    // Initial camera position: above and behind
    const radius = 1100;
    camera.position.set(cx + radius, 400, cy + radius);
    camera.lookAt(cx, 0, cy);

    // Renderer
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true }); }
    catch { setError(true); return; }
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    mount.appendChild(renderer.domElement);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xfffbe8, 1.2);
    sun.position.set(500, 800, 300);
    scene.add(sun);

    // ELEV_SCALE: halved from 8 to 4
    const ELEV_SCALE = 4;

    // Water plane: just below elevation 0 terrain (which has height = max(4, 0) = 4, top at y=4)
    // So water sits at y = 3.5 (just below the top of elev-0 pieces)
    const waterGeo = new THREE.PlaneGeometry(6000, 6000);
    const waterMat = new THREE.MeshLambertMaterial({ color: 0x1e5faa, transparent: true, opacity: 0.85 });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(cx, 3.5, cy);
    scene.add(water);

    // Sky gradient sphere
    const skyGeo = new THREE.SphereGeometry(3000, 16, 8);
    const skyMat = new THREE.MeshBasicMaterial({ color: 0x87ceeb, side: THREE.BackSide });
    scene.add(new THREE.Mesh(skyGeo, skyMat));

    // Compute 3D height with biome multipliers
    function getHeight3D(elev) {
      const base = Math.max(4, elev * ELEV_SCALE);
      if (elev >= 11 && elev <= 16) return Math.max(4, elev * ELEV_SCALE * 3);  // mountain: 3Ã—
      return base;
    }

    const island = new THREE.Group(); scene.add(island);
    const disposeGroup = group => {
      const geometries = new Set(), materials = new Set();
      group.traverse(o => { if (o.isInstancedMesh) o.dispose(); if (o.geometry) geometries.add(o.geometry); if(o.material) materials.add(o.material); });
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); group.clear();
    };
    let lastSignature = '';
    function refreshIsland() {
      const { grid, trees, clouds } = stateRef.current;
      const keys = Object.keys(grid);
      const signature = JSON.stringify([Object.entries(grid).map(([k,v])=>[k,v.elevation]), trees, clouds.map(c=>[Math.round(c.x),Math.round(c.y)])]);
      if(signature === lastSignature) return;
      lastSignature = signature; disposeGroup(island);
    // Shared boxes keep large islands to one terrain draw call.
    const terrain = new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshLambertMaterial(), keys.length);
    const transform = new THREE.Object3D();
    keys.forEach((key, i) => {
      const [gx, gy] = key.split(',').map(Number), elev = grid[key].elevation || 0, height = getHeight3D(elev);
      transform.position.set(gx*PIECE_SIZE+PIECE_SIZE/2, height/2, gy*PIECE_SIZE+PIECE_SIZE/2);
      transform.scale.set(PIECE_SIZE-2,height,PIECE_SIZE-2); transform.updateMatrix();
      terrain.setMatrixAt(i,transform.matrix); terrain.setColorAt(i,getBiomeColor3D(elev));
    });
    island.add(terrain);

    // Empty cells adjacent to occupied pieces: thin white slabs at the waterline
    const occupied = new Set(keys);
    const emptyNeighbors = new Set();
    const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const key of keys) {
      const [gx, gy] = key.split(',').map(Number);
      for (const [dx, dy] of DIRS) {
        const nk = `${gx + dx},${gy + dy}`;
        if (!occupied.has(nk)) emptyNeighbors.add(nk);
      }
    }
    const whiteH = 0.5;
    const whiteY = 3.5 + whiteH / 2; // just above the blue water
    const whiteMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const slabs = new THREE.InstancedMesh(new THREE.BoxGeometry(PIECE_SIZE-2,whiteH,PIECE_SIZE-2),whiteMat,emptyNeighbors.size);
    transform.scale.set(1,1,1);
    [...emptyNeighbors].forEach((key,i) => {
      const [gx,gy]=key.split(',').map(Number);
      transform.position.set(gx*PIECE_SIZE+PIECE_SIZE/2,whiteY,gy*PIECE_SIZE+PIECE_SIZE/2);transform.updateMatrix();slabs.setMatrixAt(i,transform.matrix);
    }); island.add(slabs);

    // Trees: trunk + leaf cluster spheres
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x3aaa40 });
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b3f1a });
    for (const tree of (trees || [])) {
      const key = `${tree.gx},${tree.gy}`;
      const elev = grid[key]?.elevation || 0;
      const terrainHeight = getHeight3D(elev);
      const leafCount = tree.leafCount || 5;
      const leafRadius = tree.size * 0.28;
      const spreadR = leafRadius * 0.7;
      const trunkH = leafRadius * 1.2;
      const trunkR = leafRadius * 0.12;

      // Trunk
      const trunkGeo = new THREE.CylinderGeometry(trunkR, trunkR * 1.3, trunkH, 6);
      const trunkMesh = new THREE.Mesh(trunkGeo, trunkMat);
      trunkMesh.position.set(tree.x, terrainHeight + trunkH / 2, tree.y);
      island.add(trunkMesh);

      // Leaves radiating around center, yscale 0.1 (90% reduction)
      for (let i = 0; i < leafCount; i++) {
        const angle = (i / leafCount) * Math.PI * 2;
        const lx = tree.x + Math.cos(angle) * spreadR;
        const lz = tree.y + Math.sin(angle) * spreadR;
        const geo = new THREE.SphereGeometry(leafRadius, 7, 7);
        const mesh = new THREE.Mesh(geo, leafMat);
        mesh.scale.set(1, 0.1, 1);
        mesh.position.set(lx, terrainHeight + trunkH + leafRadius * 0.06, lz);
        island.add(mesh);
      }
    }

    // Clouds: single sphere per cloud, high up, 30% opaque, yscale halved
    const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.30, depthWrite: false });
    const cloudMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(76,10,10),cloudMat,clouds.length);
    transform.scale.set(1,.5,1);
    clouds.forEach((cloud,i) => {
      transform.position.set(cloud.x,300+Math.sin(cloud.x*.01+cloud.y*.01)*40,cloud.y); transform.updateMatrix();cloudMesh.setMatrixAt(i,transform.matrix);
    });island.add(cloudMesh);
    }
    refreshIsland();

    // Orbit controls (manual)
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    let theta = Math.PI / 4;
    let phi = Math.PI / 3.5;
    let orbitRadius = radius;

    const updateCamera = () => {
      camera.position.set(
        cx + orbitRadius * Math.sin(phi) * Math.sin(theta),
        orbitRadius * Math.cos(phi),
        cy + orbitRadius * Math.sin(phi) * Math.cos(theta)
      );
      camera.lookAt(cx, 0, cy);
    };
    updateCamera();

    const onMouseDown = (e) => { isDragging = true; prevMouse = { x: e.clientX, y: e.clientY }; };
    const onMouseUp = () => { isDragging = false; };
    const onTouchEnd = () => { lastTouch = null; lastTouchDist = null; };
    const onMouseMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;
      theta -= dx * 0.005;
      phi = Math.max(0.15, Math.min(Math.PI / 2.1, phi - dy * 0.005));
      prevMouse = { x: e.clientX, y: e.clientY };
      updateCamera();
    };
    const onWheel = (e) => {
      orbitRadius = Math.max(150, Math.min(2000, orbitRadius + e.deltaY * 0.5));
      updateCamera();
    };

    // Touch orbit
    let lastTouchDist = null;
    let lastTouch = null;
    const onTouchStart = (e) => {
      if (e.touches.length === 1) lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      if (e.touches.length === 2) lastTouchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    };
    const onTouchMove = (e) => {
      if (e.touches.length === 1 && lastTouch) {
        const dx = e.touches[0].clientX - lastTouch.x;
        const dy = e.touches[0].clientY - lastTouch.y;
        theta -= dx * 0.005;
        phi = Math.max(0.15, Math.min(Math.PI / 2.1, phi - dy * 0.005));
        lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        updateCamera();
      }
      if (e.touches.length === 2 && lastTouchDist) {
        const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        orbitRadius = Math.max(150, Math.min(2000, orbitRadius * (lastTouchDist / dist)));
        lastTouchDist = dist;
        updateCamera();
      }
    };

    mount.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
    mount.addEventListener('wheel', onWheel, { passive: true });
    mount.addEventListener('touchstart', onTouchStart);
    mount.addEventListener('touchmove', onTouchMove);
    mount.addEventListener('touchend', onTouchEnd);
    mount.addEventListener('touchcancel', onTouchEnd);

    // Resize
    const onResize = () => {
      const nw = mount.clientWidth;
      const nh = mount.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', onResize);

    // Animate
    let animId, lastRefresh = 0;
    const animate = (time = 0) => {
      animId = requestAnimationFrame(animate);
      if (document.hidden) return;
      if(time-lastRefresh>1000) { refreshIsland(); lastRefresh=time; }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      mount.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      mount.removeEventListener('wheel', onWheel);
      mount.removeEventListener('touchstart', onTouchStart);
      mount.removeEventListener('touchmove', onTouchMove);
      mount.removeEventListener('touchend', onTouchEnd);
      mount.removeEventListener('touchcancel', onTouchEnd);
      disposeGroup(scene);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [stateRef]);

  if (error) return <p role="alert" className="p-8 text-white">The 3D island could not open. Use “Show 2D island” to keep playing.</p>;
  return <div ref={mountRef} className="absolute inset-0 w-full h-full" style={{ touchAction: 'none' }} />;
}