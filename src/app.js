import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import Peer from 'peerjs';

/* ==========================================================================
   1. Configuration & Asset Registry
   ========================================================================== */
const GRID_SIZE = 48; // 48x48 parcels
const TILE_SIZE = 2; // Matches Kenney 2x2 grid units exactly
const GRID_HALF = (GRID_SIZE * TILE_SIZE) / 2;

const PEER_CONFIG = {
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' }
    ]
  }
};

const STRUCTURES = {
  // Roads
  'road-straight': { name: 'Straight Road', file: 'road-straight.glb', cat: 'roads', pop: 0, cost: 15 },
  'road-corner': { name: 'Corner Turn', file: 'road-corner.glb', cat: 'roads', pop: 0, cost: 15 },
  'road-intersection': { name: '4-Way Junction', file: 'road-intersection.glb', cat: 'roads', pop: 0, cost: 25 },
  'road-split': { name: 'T-Split Road', file: 'road-split.glb', cat: 'roads', pop: 0, cost: 20 },
  'road-straight-lightposts': { name: 'Boulevard Lights', file: 'road-straight-lightposts.glb', cat: 'roads', pop: 0, cost: 30 },
  
  // Buildings
  'building-small-a': { name: 'Apartments A', file: 'building-small-a.glb', cat: 'buildings', pop: 24, cost: 100 },
  'building-small-b': { name: 'Commerce Loft', file: 'building-small-b.glb', cat: 'buildings', pop: 18, cost: 120 },
  'building-small-c': { name: 'High-Rise Unit', file: 'building-small-c.glb', cat: 'buildings', pop: 45, cost: 220 },
  'building-small-d': { name: 'Suburban Villa', file: 'building-small-d.glb', cat: 'buildings', pop: 12, cost: 80 },
  'building-garage': { name: 'Civic Depot', file: 'building-garage.glb', cat: 'buildings', pop: 8, cost: 90 },

  // Parks & Nature
  'grass-trees': { name: 'Community Grove', file: 'grass-trees.glb', cat: 'parks', pop: 0, cost: 40 },
  'grass-trees-tall': { name: 'Pine Reserve', file: 'grass-trees-tall.glb', cat: 'parks', pop: 0, cost: 50 },
  'grass': { name: 'Lawn Parcel', file: 'grass.glb', cat: 'parks', pop: 0, cost: 10 },

  // Plazas & Civic
  'pavement': { name: 'Pedestrian Walk', file: 'pavement.glb', cat: 'pavement', pop: 0, cost: 10 },
  'pavement-fountain': { name: 'Central Fountain', file: 'pavement-fountain.glb', cat: 'pavement', pop: 5, cost: 150 }
};

/* ==========================================================================
   2. Soft Tactile Audio Engine (Gentle Chimes & Ambient Harmony)
   ========================================================================== */
const AudioEngine = (() => {
  let ctx, gFx;
  let sfxOn = false;

  const init = () => {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    ctx = new AudioCtx();
    gFx = ctx.createGain();
    gFx.gain.value = sfxOn ? 0.35 : 0;
    gFx.connect(ctx.destination);
  };

  const softChime = (freqs, dur = 0.12, vol = 0.2) => {
    if (!ctx || !sfxOn) return;
    try {
      const t = ctx.currentTime;
      freqs.forEach((f, idx) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(f, t + idx * 0.03);
        g.gain.setValueAtTime(vol / freqs.length, t + idx * 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.03 + dur);
        o.connect(g);
        g.connect(gFx);
        o.start(t + idx * 0.03);
        o.stop(t + idx * 0.03 + dur + 0.05);
      });
    } catch (e) {}
  };

  return {
    init,
    playPlace() { softChime([523.25, 659.25], 0.14, 0.22); }, // C5, E5
    playDemolish() { softChime([392.00, 329.63], 0.16, 0.25); }, // G4, E4
    playRotate() { softChime([587.33], 0.06, 0.12); }, // D5
    playJoin() { softChime([440.00, 554.37, 659.25], 0.22, 0.25); }, // A4 major chord
    playLeave() { softChime([659.25, 554.37, 440.00], 0.22, 0.25); },
    toggleSfx(val) {
      sfxOn = val;
      if (gFx && ctx) gFx.gain.setValueAtTime(sfxOn ? 0.35 : 0, ctx.currentTime);
      return sfxOn;
    },
    get sfxOn() { return sfxOn; }
  };
})();

/* ==========================================================================
   3. Three.js Scene, Living Pastel Terrain & Atmospheric Lighting
   ========================================================================== */
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const DAY_COLOR = '#EAE6DE';
const NIGHT_COLOR = '#2B3330';

scene.background = new THREE.Color(DAY_COLOR);
scene.fog = new THREE.FogExp2(DAY_COLOR, 0.005);

// Soft Warm Sunlight & Hemispheric Pastel Fill
const hemiLight = new THREE.HemisphereLight(0xF4EFEA, 0xC8D5C6, 0.95);
const dirLight = new THREE.DirectionalLight(0xFFFBF0, 1.8);
dirLight.position.set(36, 52, 28);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 200;
const d = 48;
dirLight.shadow.camera.left = -d;
dirLight.shadow.camera.right = d;
dirLight.shadow.camera.top = d;
dirLight.shadow.camera.bottom = -d;
dirLight.shadow.bias = -0.0002;
scene.add(hemiLight, dirLight);

// --- LIVING PASTEL MEADOW CANVAS TEXTURE ---
function makeGrassTexture() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 512;
  const ctx = cv.getContext('2d');
  
  // Soft curated pastel meadow tones
  const c1 = '#84A98C';
  const c2 = '#7CA184';
  const pathColor = '#D4C3A3';
  
  const step = 64;
  for (let x = 0; x < 512; x += step) {
    for (let y = 0; y < 512; y += step) {
      ctx.fillStyle = ((x / step + y / step) % 2 === 0) ? c1 : c2;
      ctx.fillRect(x, y, step, step);

      // Subtle pastel parcel border line
      ctx.strokeStyle = 'rgba(235, 230, 220, 0.12)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, step, step);

      // Soft micro organic meadow flecks
      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.fillRect(x + 16, y + 18, 4, 6);
      ctx.fillRect(x + 40, y + 38, 5, 5);
      ctx.fillStyle = 'rgba(40, 60, 45, 0.05)';
      ctx.fillRect(x + 28, y + 30, 6, 3);
    }
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(GRID_SIZE / 4, GRID_SIZE / 4);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return tex;
}

const groundGeo = new THREE.PlaneGeometry(GRID_SIZE * TILE_SIZE, GRID_SIZE * TILE_SIZE);
groundGeo.rotateX(-Math.PI / 2);
const groundMat = new THREE.MeshStandardMaterial({
  map: makeGrassTexture(),
  roughness: 0.88,
  metalness: 0.02
});
const groundMesh = new THREE.Mesh(groundGeo, groundMat);
groundMesh.position.y = 0;
groundMesh.receiveShadow = true;
scene.add(groundMesh);

// Thin parcel boundary grid overlay in soft pastel sage
const gridHelper = new THREE.GridHelper(GRID_SIZE * TILE_SIZE, GRID_SIZE, 0x6B9080, 0x9BB6A9);
gridHelper.position.y = 0.012;
gridHelper.material.opacity = 0.24;
gridHelper.material.transparent = true;
scene.add(gridHelper);

/* ==========================================================================
   4. Camera Controller Architecture (Ported from interiordemo)
   ========================================================================== */
let aspect = window.innerWidth / window.innerHeight;
let frustumSize = 34;

const orthoCam = new THREE.OrthographicCamera(
  -frustumSize * aspect / 2,
  frustumSize * aspect / 2,
  frustumSize / 2,
  -frustumSize / 2,
  0.1,
  450
);

const perspCam = new THREE.PerspectiveCamera(50, aspect, 0.2, 500);

let activeCamera = orthoCam;
let camMode = 'iso'; // 'iso', 'third', 'first'

// Camera focus target on ground
const camTarget = new THREE.Vector3(0, 0, 0);

function updateOrthoCam() {
  const dist = 55;
  // Isometric angle ~35.264°
  orthoCam.position.set(camTarget.x + dist, dist * 0.85, camTarget.z + dist);
  orthoCam.lookAt(camTarget.x, 0, camTarget.z);
  orthoCam.left = -frustumSize * aspect / 2;
  orthoCam.right = frustumSize * aspect / 2;
  orthoCam.top = frustumSize / 2;
  orthoCam.bottom = -frustumSize / 2;
  orthoCam.updateProjectionMatrix();
}
updateOrthoCam();

// Citizen Avatar (for 3rd & 1st person street walk)
const avatarGroup = new THREE.Group();
const avatarBody = new THREE.Mesh(
  new THREE.CylinderGeometry(0.3, 0.35, 1.2, 10),
  new THREE.MeshStandardMaterial({ color: 0x6B9080, roughness: 0.4 })
);
avatarBody.position.y = 0.6;
avatarBody.castShadow = true;
avatarGroup.add(avatarBody);

const avatarHead = new THREE.Mesh(
  new THREE.SphereGeometry(0.24, 10, 10),
  new THREE.MeshStandardMaterial({ color: 0xDDA15E, roughness: 0.3 })
);
avatarHead.position.y = 1.35;
avatarHead.castShadow = true;
avatarGroup.add(avatarHead);

scene.add(avatarGroup);
avatarGroup.position.set(0, 0, 0);
avatarGroup.visible = false;

function setCamMode(mode) {
  camMode = mode;
  document.querySelectorAll('.cam-modes .pastel-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cam === mode);
  });

  const joyZone = document.getElementById('joystick-zone');
  if (mode === 'iso') {
    activeCamera = orthoCam;
    avatarGroup.visible = false;
    updateOrthoCam();
    if (joyZone) joyZone.classList.add('hidden');
  } else if (mode === 'third') {
    activeCamera = perspCam;
    avatarGroup.visible = true;
    if (joyZone && window.__hasTouchedScreen) joyZone.classList.remove('hidden');
  } else if (mode === 'first') {
    activeCamera = perspCam;
    avatarGroup.visible = false;
    if (joyZone && window.__hasTouchedScreen) joyZone.classList.remove('hidden');
  }
  toast(`Camera Mode: ${mode.toUpperCase()}`);
}

/* ==========================================================================
   5. GLTF Model Loader, Clean Snapping & Structure Placement
   ========================================================================== */
const loader = new GLTFLoader();
const modelPrototypes = {};
const cityGrid = new Map(); // key: `x,z` -> { id, rotation, mesh }
let currentSelectedId = 'building-small-a';
let currentRotation = 0;
let isDemolishMode = false;

const modelFiles = Object.keys(STRUCTURES);
let loadedCount = 0;

modelFiles.forEach(key => {
  const item = STRUCTURES[key];
  loader.load(`assets/models/${item.file}`, (gltf) => {
    const root = gltf.scene;
    root.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    // Ensure Kenney model center and sit exactly flush on y = 0
    const box = new THREE.Box3().setFromObject(root);
    root.position.y = -box.min.y;
    
    const container = new THREE.Group();
    container.add(root);
    modelPrototypes[key] = container;
    
    loadedCount++;
    if (loadedCount === modelFiles.length) {
      initPaletteUI();
      updateGhostPreview();
      seedInitialSettlement();
    }
  });
});

function seedInitialSettlement() {
  placeStructure('road-straight', 0, 0, 0, true);
  placeStructure('road-intersection', 0, 2, 0, true);
  placeStructure('building-small-a', -2, 2, 1, true);
  placeStructure('building-small-b', 2, 2, 3, true);
  placeStructure('grass-trees', 0, 4, 0, true);
}

// Snapping Ghost Mesh Preview
const ghostMatValid = new THREE.MeshBasicMaterial({
  color: 0x6B9080,
  transparent: true,
  opacity: 0.55,
  wireframe: true
});

const ghostMatInvalid = new THREE.MeshBasicMaterial({
  color: 0xD47B6A,
  transparent: true,
  opacity: 0.65,
  wireframe: true
});

let ghostMesh = new THREE.Group();
scene.add(ghostMesh);

function updateGhostPreview() {
  while (ghostMesh.children.length) ghostMesh.remove(ghostMesh.children[0]);
  if (isDemolishMode) {
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(TILE_SIZE * 0.95, 0.4, TILE_SIZE * 0.95),
      new THREE.MeshBasicMaterial({ color: 0xD47B6A, transparent: true, opacity: 0.55 })
    );
    box.position.y = 0.2;
    ghostMesh.add(box);
    return;
  }
  const proto = modelPrototypes[currentSelectedId];
  if (!proto) return;
  const clone = proto.clone(true);
  clone.traverse(child => {
    if (child.isMesh) child.material = ghostMatValid;
  });
  clone.rotation.y = currentRotation * (Math.PI / 2);
  ghostMesh.add(clone);
}

// Coordinate Snapping (Grid parcel alignment)
function snapToGrid(val) {
  const snapped = Math.round(val / TILE_SIZE) * TILE_SIZE;
  const maxCoord = GRID_HALF - TILE_SIZE;
  return Math.max(-maxCoord, Math.min(maxCoord, snapped));
}

const raycaster = new THREE.Raycaster();
const mouseVec = new THREE.Vector2();

function getRaycastIntersection(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  mouseVec.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  mouseVec.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouseVec, activeCamera);
  const hits = raycaster.intersectObject(groundMesh);
  return hits.length ? hits[0].point : null;
}

function updateGhostPosition(pt) {
  if (!pt) {
    ghostMesh.visible = false;
    return;
  }
  const gx = snapToGrid(pt.x);
  const gz = snapToGrid(pt.z);
  ghostMesh.position.set(gx, 0, gz);
  ghostMesh.visible = true;

  const key = `${gx},${gz}`;
  const isOccupied = cityGrid.has(key);

  // Visual validity indicator
  ghostMesh.traverse(child => {
    if (child.isMesh) {
      if (isDemolishMode) {
        child.material = ghostMatInvalid;
      } else {
        child.material = isOccupied ? ghostMatInvalid : ghostMatValid;
      }
    }
  });

  document.getElementById('hud-coord').textContent = `X: ${gx / TILE_SIZE}, Z: ${gz / TILE_SIZE}`;
}

function placeStructure(id, x, z, rot, isRemote = false) {
  const key = `${x},${z}`;
  if (cityGrid.has(key)) {
    if (!isRemote) toast('Parcel occupied! Bulldoze first.');
    return;
  }
  const proto = modelPrototypes[id];
  if (!proto) return;

  const mesh = proto.clone(true);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = rot * (Math.PI / 2);
  scene.add(mesh);

  cityGrid.set(key, { id, rotation: rot, mesh });
  updateCityStats();
  AudioEngine.playPlace();

  if (!isRemote && net.connected) {
    net.broadcast({ t: 'place', id, x, z, rot });
  }
}

function demolishStructure(x, z, isRemote = false) {
  const key = `${x},${z}`;
  if (!cityGrid.has(key)) return;

  const item = cityGrid.get(key);
  scene.remove(item.mesh);
  cityGrid.delete(key);
  updateCityStats();
  AudioEngine.playDemolish();

  if (!isRemote && net.connected) {
    net.broadcast({ t: 'remove', x, z });
  }
}

function handleSceneTap(clientX, clientY) {
  if (camMode !== 'iso') return;
  const pt = getRaycastIntersection(clientX, clientY);
  if (!pt) return;

  const gx = snapToGrid(pt.x);
  const gz = snapToGrid(pt.z);

  if (isDemolishMode) {
    demolishStructure(gx, gz);
  } else {
    placeStructure(currentSelectedId, gx, gz, currentRotation);
  }
}

function updateCityStats() {
  let population = 0;
  cityGrid.forEach(entry => {
    const s = STRUCTURES[entry.id];
    if (s && s.pop) population += s.pop;
  });
  document.getElementById('hud-pop').textContent = population;
}

/* ==========================================================================
   6. Touch Drag & PC Controls (Ported from interiordemo)
   ========================================================================== */
let isMouseDown = false;
let isDraggingMouse = false;
let mouseDownX = 0;
let mouseDownY = 0;
let lastMouseX = 0;
let lastMouseY = 0;
let mouseButton = 0;

// Prevent Context Menu on canvas to allow smooth right-click panning / orbiting
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// Desktop Mouse Down
canvas.addEventListener('mousedown', (e) => {
  if (e.pointerType && e.pointerType !== 'mouse') return;
  isMouseDown = true;
  isDraggingMouse = false;
  mouseDownX = e.clientX;
  mouseDownY = e.clientY;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  mouseButton = e.button;
});

// Desktop Mouse Move
window.addEventListener('mousemove', (e) => {
  if (isMouseDown) {
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    const dragDist = Math.hypot(e.clientX - mouseDownX, e.clientY - mouseDownY);
    if (dragDist > 4) {
      isDraggingMouse = true;
    }
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;

    if (isDraggingMouse) {
      if (camMode === 'iso') {
        // Pan the camera target smoothly across the isometric ground plane
        const panSpeed = (frustumSize / window.innerHeight) * 1.35;
        // Project screen delta into isometric plane
        camTarget.x += (-dx + dy) * panSpeed * 0.707;
        camTarget.z += (dx + dy) * panSpeed * 0.707;
        const maxLimit = GRID_HALF * 1.1;
        camTarget.x = Math.max(-maxLimit, Math.min(maxLimit, camTarget.x));
        camTarget.z = Math.max(-maxLimit, Math.min(maxLimit, camTarget.z));
        updateOrthoCam();
      } else {
        // Look around in first/third person
        avatarYaw -= dx * 0.004;
        avatarGroup.rotation.y = avatarYaw;
      }
    }
  } else if (camMode === 'iso') {
    // Passive cursor hover snapping preview
    const pt = getRaycastIntersection(e.clientX, e.clientY);
    updateGhostPosition(pt);
  }
});

// Desktop Mouse Up
window.addEventListener('mouseup', (e) => {
  if (!isMouseDown) return;
  const wasDragging = isDraggingMouse;
  const btn = mouseButton;
  isMouseDown = false;
  isDraggingMouse = false;

  // Clean Left Click (not a drag): Trigger Placement / Bulldoze
  if (!wasDragging && btn === 0) {
    handleSceneTap(e.clientX, e.clientY);
  }
});

// Mouse Wheel Zoom
window.addEventListener('wheel', (e) => {
  if (camMode === 'iso') {
    frustumSize = Math.max(14, Math.min(76, frustumSize + e.deltaY * 0.04));
    updateOrthoCam();
  }
}, { passive: true });

/* --- Mobile Touch Drag & Clean Tap Logic (from interiordemo) --- */
let touchStartX = 0;
let touchStartY = 0;
let lastTouchX = 0;
let lastTouchY = 0;
let isTouchDragging = false;
let touchPinchDist = null;
let activeTouchId = null;

canvas.addEventListener('touchstart', (e) => {
  window.__hasTouchedScreen = true;
  const joyZone = document.getElementById('joystick-zone');
  if (joyZone && camMode !== 'iso') joyZone.classList.remove('hidden');

  if (e.touches.length === 1) {
    const t = e.touches[0];
    activeTouchId = t.identifier;
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    lastTouchX = t.clientX;
    lastTouchY = t.clientY;
    isTouchDragging = false;
    touchPinchDist = null;
  } else if (e.touches.length === 2) {
    // Pinch zoom start
    touchPinchDist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
  }
}, { passive: true });

canvas.addEventListener('touchmove', (e) => {
  if (e.touches.length === 1 && activeTouchId !== null) {
    const t = e.touches[0];
    if (t.identifier !== activeTouchId) return;

    const dx = t.clientX - lastTouchX;
    const dy = t.clientY - lastTouchY;
    const dist = Math.hypot(t.clientX - touchStartX, t.clientY - touchStartY);
    if (dist > 8) {
      isTouchDragging = true;
    }
    lastTouchX = t.clientX;
    lastTouchY = t.clientY;

    if (isTouchDragging) {
      if (camMode === 'iso') {
        const panSpeed = (frustumSize / window.innerHeight) * 1.5;
        camTarget.x += (-dx + dy) * panSpeed * 0.707;
        camTarget.z += (dx + dy) * panSpeed * 0.707;
        const maxLimit = GRID_HALF * 1.1;
        camTarget.x = Math.max(-maxLimit, Math.min(maxLimit, camTarget.x));
        camTarget.z = Math.max(-maxLimit, Math.min(maxLimit, camTarget.z));
        updateOrthoCam();
      } else {
        avatarYaw -= dx * 0.005;
        avatarGroup.rotation.y = avatarYaw;
      }
    }
  } else if (e.touches.length === 2 && touchPinchDist !== null && camMode === 'iso') {
    // Two-finger pinch-to-zoom
    const newDist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    const diff = touchPinchDist - newDist;
    frustumSize = Math.max(14, Math.min(76, frustumSize + diff * 0.08));
    updateOrthoCam();
    touchPinchDist = newDist;
  }
}, { passive: true });

canvas.addEventListener('touchend', (e) => {
  if (activeTouchId !== null) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === activeTouchId) {
        // Quick clean tap (< 8px movement): Place or Bulldoze structure
        if (!isTouchDragging) {
          handleSceneTap(t.clientX, t.clientY);
        }
        activeTouchId = null;
        isTouchDragging = false;
        break;
      }
    }
  }
  if (e.touches.length < 2) touchPinchDist = null;
});

canvas.addEventListener('touchcancel', () => {
  activeTouchId = null;
  isTouchDragging = false;
  touchPinchDist = null;
});

// --- Virtual Joystick for Mobile (from interiordemo) ---
let joyTouchId = null;
let touchJoystickVector = { x: 0, y: 0 };

const joyZone = document.getElementById('joystick-zone');
const joyThumb = document.getElementById('joystick-thumb');

if (joyZone) {
  joyZone.addEventListener('touchstart', (e) => {
    if (joyTouchId !== null) return;
    const t = e.changedTouches[0];
    joyTouchId = t.identifier;
    updateJoystick(t);
  }, { passive: true });

  joyZone.addEventListener('touchmove', (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joyTouchId) {
        updateJoystick(e.changedTouches[i]);
        break;
      }
    }
  }, { passive: true });

  const resetJoystick = (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joyTouchId) {
        joyTouchId = null;
        touchJoystickVector = { x: 0, y: 0 };
        if (joyThumb) joyThumb.style.transform = 'translate(0px, 0px)';
        break;
      }
    }
  };
  joyZone.addEventListener('touchend', resetJoystick);
  joyZone.addEventListener('touchcancel', resetJoystick);

  function updateJoystick(touch) {
    const rect = joyZone.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const dx = touch.clientX - (rect.left + centerX);
    const dy = touch.clientY - (rect.top + centerY);
    const dist = Math.hypot(dx, dy);
    const maxR = centerX - 6;
    const clampedDist = Math.min(dist, maxR);
    const angle = Math.atan2(dy, dx);
    const clampedX = Math.cos(angle) * clampedDist;
    const clampedY = Math.sin(angle) * clampedDist;
    if (joyThumb) joyThumb.style.transform = `translate(${clampedX}px, ${clampedY}px)`;

    let norm = clampedDist / maxR;
    norm = norm < 0.08 ? 0 : (norm - 0.08) / 0.92;
    const curved = Math.pow(norm, 1.3);
    touchJoystickVector = {
      x: Math.cos(angle) * curved,
      y: Math.sin(angle) * curved
    };
  }
}

/* ==========================================================================
   7. Keyboard & Street Walking Movement
   ========================================================================== */
const keysDown = {};
window.addEventListener('keydown', (e) => {
  keysDown[e.code] = true;
  if (e.code === 'KeyR') {
    currentRotation = (currentRotation + 1) % 4;
    updateGhostPreview();
    AudioEngine.playRotate();
  }
  if (e.code === 'KeyX') {
    isDemolishMode = !isDemolishMode;
    document.getElementById('btn-demolish').classList.toggle('active', isDemolishMode);
    updateGhostPreview();
    toast(isDemolishMode ? 'BULLDOZER ACTIVE' : 'BUILD MODE ACTIVE');
  }
});
window.addEventListener('keyup', (e) => { keysDown[e.code] = false; });

let avatarYaw = 0;
const avatarSpeed = 0.16;

function updateAvatarControls() {
  if (camMode === 'iso') return;

  let forward = (keysDown['KeyW'] || keysDown['ArrowUp'] ? 1 : 0) - (keysDown['KeyS'] || keysDown['ArrowDown'] ? 1 : 0);
  let turn = (keysDown['KeyA'] || keysDown['ArrowLeft'] ? 1 : 0) - (keysDown['KeyD'] || keysDown['ArrowRight'] ? 1 : 0);

  // Blend in virtual touch joystick input
  if (touchJoystickVector.y !== 0) forward -= touchJoystickVector.y;
  if (touchJoystickVector.x !== 0) turn -= touchJoystickVector.x;

  avatarYaw += turn * 0.04;
  avatarGroup.rotation.y = avatarYaw;

  if (forward !== 0) {
    const moveZ = -Math.cos(avatarYaw) * forward * avatarSpeed;
    const moveX = -Math.sin(avatarYaw) * forward * avatarSpeed;
    avatarGroup.position.x += moveX;
    avatarGroup.position.z += moveZ;

    if (net.connected) {
      net.broadcast({ t: 'move', x: avatarGroup.position.x, z: avatarGroup.position.z, yaw: avatarYaw });
    }
  }

  // Camera positioning
  if (camMode === 'third') {
    const camOffset = new THREE.Vector3(0, 2.4, 4.4).applyAxisAngle(new THREE.Vector3(0, 1, 0), avatarYaw);
    perspCam.position.copy(avatarGroup.position).add(camOffset);
    perspCam.lookAt(avatarGroup.position.clone().add(new THREE.Vector3(0, 1.2, 0)));
  } else if (camMode === 'first') {
    perspCam.position.copy(avatarGroup.position).add(new THREE.Vector3(0, 1.5, 0));
    const lookTarget = perspCam.position.clone().add(new THREE.Vector3(-Math.sin(avatarYaw), 0, -Math.cos(avatarYaw)).multiplyScalar(10));
    perspCam.lookAt(lookTarget);
  }
}

/* ==========================================================================
   8. PeerJS 1-4 Player WebRTC Mesh & Live Voice (Ported from interiordemo)
   ========================================================================== */
const remoteAvatars = new Map();
const remoteVoiceAudios = new Map();
let localVoiceStream = null;
let isVoiceMuted = false;

function createRemoteAvatarMesh(peerId) {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 1.2, 8), new THREE.MeshStandardMaterial({ color: 0xDDA15E, roughness: 0.4 }));
  b.position.y = 0.6;
  g.add(b);
  const h = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), new THREE.MeshStandardMaterial({ color: 0x6B9080, roughness: 0.3 }));
  h.position.y = 1.35;
  g.add(h);
  scene.add(g);
  return g;
}

const code5 = () => Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');

const net = {
  peer: null,
  connections: new Map(),
  calls: new Map(),
  isHost: false,
  code: '',
  connected: false,

  broadcast(msg) {
    this.connections.forEach(conn => {
      if (conn.open) conn.send(msg);
    });
  },

  host() {
    this.leave();
    this.isHost = true;
    this.code = code5();
    const p = this.peer = new Peer('cb3d-' + this.code, PEER_CONFIG);

    p.on('open', () => {
      this.connected = true;
      document.getElementById('mp-room-info').hidden = false;
      document.getElementById('mp-room-code').textContent = this.code;
      document.getElementById('mp-peers-box').hidden = false;
      document.getElementById('btn-voice').hidden = false;
      this.updatePeersUI();
      AudioEngine.playJoin();
      toast('City room created: ' + this.code);
    });

    p.on('connection', conn => {
      if (this.connections.size >= 3) {
        conn.close();
        return;
      }
      this.attachConn(conn);
    });

    p.on('call', call => {
      call.answer(localVoiceStream || new MediaStream());
      this.attachVoice(call);
    });

    p.on('disconnected', () => {
      try { p.reconnect(); } catch (e) {}
    });

    p.on('error', err => {
      if (err.type === 'unavailable-id') this.host();
      else toast('Connection notice: ' + (err.type || 'network'));
    });
  },

  join(code) {
    this.leave();
    this.isHost = false;
    this.code = code.toUpperCase();
    const p = this.peer = new Peer(PEER_CONFIG);

    p.on('open', () => {
      this.connected = true;
      const conn = p.connect('cb3d-' + this.code, { reliable: true });
      this.attachConn(conn);
      document.getElementById('mp-modal').hidden = true;
      document.getElementById('btn-voice').hidden = false;
      AudioEngine.playJoin();
      toast('Connected to city room ' + this.code);
    });

    p.on('call', call => {
      call.answer(localVoiceStream || new MediaStream());
      this.attachVoice(call);
    });

    p.on('disconnected', () => {
      try { p.reconnect(); } catch (e) {}
    });

    p.on('error', () => toast('City room ' + code + ' not found'));
  },

  attachConn(conn) {
    this.connections.set(conn.peer, conn);
    
    conn.on('open', () => {
      this.updatePeersUI();
      AudioEngine.playJoin();
      toast('Builder joined the city');

      // Initiate voice call if local microphone stream is ready
      if (localVoiceStream && this.peer) {
        const call = this.peer.call(conn.peer, localVoiceStream);
        this.attachVoice(call);
      }

      // If host, transmit full city state snapshot
      if (this.isHost) {
        const snapshot = [];
        cityGrid.forEach((entry, key) => {
          const [x, z] = key.split(',').map(Number);
          snapshot.push({ id: entry.id, x, z, rot: entry.rotation });
        });
        conn.send({ t: 'sync', city: snapshot });

        const existingPeers = [...this.connections.keys()].filter(id => id !== conn.peer);
        if (existingPeers.length > 0) {
          conn.send({ t: 'mesh_peers', peers: existingPeers });
        }
      }
    });

    conn.on('data', data => {
      if (data.t === 'sync') {
        data.city.forEach(item => placeStructure(item.id, item.x, item.z, item.rot, true));
      } else if (data.t === 'mesh_peers') {
        data.peers.forEach(peerId => {
          if (!this.connections.has(peerId) && this.peer) {
            const peerConn = this.peer.connect(peerId, { reliable: true });
            this.attachConn(peerConn);
          }
        });
      } else if (data.t === 'place') {
        placeStructure(data.id, data.x, data.z, data.rot, true);
      } else if (data.t === 'remove') {
        demolishStructure(data.x, data.z, true);
      } else if (data.t === 'move') {
        let avatar = remoteAvatars.get(conn.peer);
        if (!avatar) {
          avatar = createRemoteAvatarMesh(conn.peer);
          remoteAvatars.set(conn.peer, avatar);
        }
        avatar.position.set(data.x, 0, data.z);
        avatar.rotation.y = data.yaw;
      } else if (data.t === 'bye') {
        this.removePeer(conn.peer);
        AudioEngine.playLeave();
        toast('A builder left the city');
      }
    });

    conn.on('close', () => this.removePeer(conn.peer));
    conn.on('error', () => this.removePeer(conn.peer));
  },

  attachVoice(call) {
    if (!call) return;
    this.calls.set(call.peer, call);

    call.on('stream', remoteStream => {
      let audioEl = remoteVoiceAudios.get(call.peer);
      if (!audioEl) {
        audioEl = document.createElement('audio');
        audioEl.autoplay = true;
        audioEl.playsInline = true;
        document.body.appendChild(audioEl);
        remoteVoiceAudios.set(call.peer, audioEl);
      }
      audioEl.srcObject = remoteStream;
      audioEl.play().catch(() => {});
      toast('Builder voice connected');
    });

    call.on('close', () => {
      const audioEl = remoteVoiceAudios.get(call.peer);
      if (audioEl) {
        audioEl.pause();
        audioEl.srcObject = null;
        remoteVoiceAudios.delete(call.peer);
      }
      this.calls.delete(call.peer);
    });

    call.on('error', err => console.warn('Voice call error:', err));
  },

  removePeer(peerId) {
    this.connections.delete(peerId);
    if (this.calls.has(peerId)) {
      try { this.calls.get(peerId).close(); } catch (e) {}
      this.calls.delete(peerId);
    }
    if (remoteVoiceAudios.has(peerId)) {
      const a = remoteVoiceAudios.get(peerId);
      a.pause();
      a.srcObject = null;
      remoteVoiceAudios.delete(peerId);
    }
    if (remoteAvatars.has(peerId)) {
      scene.remove(remoteAvatars.get(peerId));
      remoteAvatars.delete(peerId);
    }
    this.updatePeersUI();
  },

  leave() {
    if (this.connected) {
      this.broadcast({ t: 'bye' });
    }
    this.connections.forEach(conn => { try { conn.close(); } catch (e) {} });
    this.connections.clear();
    this.calls.forEach(call => { try { call.close(); } catch (e) {} });
    this.calls.clear();
    remoteVoiceAudios.forEach(a => { a.pause(); a.srcObject = null; });
    remoteVoiceAudios.clear();
    remoteAvatars.forEach(av => scene.remove(av));
    remoteAvatars.clear();

    if (this.peer) {
      try { this.peer.destroy(); } catch (e) {}
      this.peer = null;
    }
    this.connected = false;
    this.isHost = false;
    document.getElementById('mp-room-info').hidden = true;
    document.getElementById('mp-peers-box').hidden = true;
    document.getElementById('btn-voice').hidden = true;
    toast('Disconnected from multiplayer city');
  },

  updatePeersUI() {
    const list = document.getElementById('mp-peers-list');
    if (!list) return;
    list.innerHTML = '';
    const myPill = document.createElement('div');
    myPill.className = 'peer-pill';
    myPill.innerHTML = `<span>YOU (${this.isHost ? 'Host' : 'Guest'})</span><span class="peer-indicator"></span>`;
    list.appendChild(myPill);

    this.connections.forEach((_, id) => {
      const p = document.createElement('div');
      p.className = 'peer-pill';
      p.innerHTML = `<span>Builder ${id.slice(-4)}</span><span class="peer-indicator"></span>`;
      list.appendChild(p);
    });
  }
};

/* ==========================================================================
   9. Microphone Toggle Controller
   ========================================================================== */
async function toggleVoice() {
  const btn = document.getElementById('btn-voice');
  if (!btn) return;

  if (!localVoiceStream) {
    try {
      toast('Requesting microphone access...');
      localVoiceStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      isVoiceMuted = false;
      btn.textContent = 'MIC: LIVE';
      btn.classList.add('active');
      toast('Microphone live');

      net.connections.forEach((_, peerId) => {
        if (net.peer && !net.calls.has(peerId)) {
          const call = net.peer.call(peerId, localVoiceStream);
          net.attachVoice(call);
        }
      });
    } catch (err) {
      console.warn('Microphone error:', err);
      toast('Microphone access denied or unavailable');
      localVoiceStream = null;
      btn.textContent = 'MIC: OFF';
      btn.classList.remove('active');
    }
  } else {
    isVoiceMuted = !isVoiceMuted;
    localVoiceStream.getAudioTracks().forEach(t => { t.enabled = !isVoiceMuted; });
    btn.textContent = isVoiceMuted ? 'MIC: MUTED' : 'MIC: LIVE';
    btn.classList.toggle('active', !isVoiceMuted);
    toast(isVoiceMuted ? 'Microphone muted' : 'Microphone unmuted');
  }
}

/* ==========================================================================
   10. UI Bindings & Pastel Palette Dock
   ========================================================================== */
function initPaletteUI() {
  const container = document.getElementById('palette-items');
  container.innerHTML = '';

  const activeCat = document.querySelector('.cat-btn.active')?.dataset.cat || 'roads';
  const filtered = Object.keys(STRUCTURES).filter(k => STRUCTURES[k].cat === activeCat);

  filtered.forEach(key => {
    const s = STRUCTURES[key];
    const card = document.createElement('div');
    card.className = 'item-card' + (key === currentSelectedId && !isDemolishMode ? ' selected' : '');
    card.innerHTML = `<div class="item-card-preview">■</div><div class="item-card-name">${s.name}</div>`;
    card.onclick = () => {
      isDemolishMode = false;
      document.getElementById('btn-demolish').classList.remove('active');
      currentSelectedId = key;
      document.querySelectorAll('.item-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      updateGhostPreview();
      AudioEngine.playRotate();
    };
    container.appendChild(card);
  });
}

document.querySelectorAll('.cat-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    initPaletteUI();
  };
});

document.getElementById('btn-rotate').onclick = () => {
  currentRotation = (currentRotation + 1) % 4;
  updateGhostPreview();
  AudioEngine.playRotate();
};

document.getElementById('btn-demolish').onclick = () => {
  isDemolishMode = !isDemolishMode;
  document.getElementById('btn-demolish').classList.toggle('active', isDemolishMode);
  updateGhostPreview();
  toast(isDemolishMode ? 'BULLDOZER ACTIVE' : 'BUILD MODE ACTIVE');
};

// Camera Buttons
document.getElementById('btn-cam-iso').onclick = () => setCamMode('iso');
document.getElementById('btn-cam-third').onclick = () => setCamMode('third');
document.getElementById('btn-cam-first').onclick = () => setCamMode('first');

// Pixel FX Toggle
let pixelFxOn = false;
document.getElementById('btn-pixel-fx').onclick = () => {
  pixelFxOn = !pixelFxOn;
  const btn = document.getElementById('btn-pixel-fx');
  btn.textContent = pixelFxOn ? 'PIXEL: ON' : 'PIXEL: OFF';
  btn.classList.toggle('active', pixelFxOn);
  renderer.setPixelRatio(pixelFxOn ? 0.35 : Math.min(window.devicePixelRatio, 2));
  toast(pixelFxOn ? '2.5D Pixel Shading: ON' : '2.5D Pixel Shading: OFF');
};

// Day / Night Toggle
let isNight = false;
document.getElementById('btn-day-night').onclick = () => {
  isNight = !isNight;
  const btn = document.getElementById('btn-day-night');
  btn.textContent = isNight ? 'NIGHT' : 'DAY';
  const c = isNight ? NIGHT_COLOR : DAY_COLOR;
  scene.background.set(c);
  scene.fog.color.set(c);
  dirLight.intensity = isNight ? 0.6 : 1.8;
  hemiLight.intensity = isNight ? 0.3 : 0.95;
};

// Audio Controls
document.getElementById('btn-sfx').onclick = () => {
  AudioEngine.init();
  const on = AudioEngine.toggleSfx(!AudioEngine.sfxOn);
  document.getElementById('btn-sfx').textContent = on ? 'SFX: ON' : 'SFX: OFF';
  document.getElementById('btn-sfx').classList.toggle('active', on);
  toast(on ? 'Sound Effects Enabled' : 'Sound Effects Muted');
};

document.getElementById('btn-voice').onclick = toggleVoice;

// Multiplayer Modal
document.getElementById('btn-mp-open').onclick = () => {
  document.getElementById('mp-modal').hidden = false;
};
document.getElementById('mp-close-btn').onclick = () => {
  document.getElementById('mp-modal').hidden = true;
};
document.getElementById('mp-create-btn').onclick = () => {
  AudioEngine.init();
  net.host();
};
document.getElementById('mp-join-btn').onclick = () => {
  const c = document.getElementById('mp-input-code').value.trim();
  if (c.length === 5) {
    AudioEngine.init();
    net.join(c);
  } else {
    toast('Enter valid 5-character code');
  }
};
document.getElementById('mp-copy-link-btn').onclick = async () => {
  const u = location.origin + location.pathname + '?room=' + net.code;
  try {
    await navigator.clipboard.writeText(u);
    toast('Room invite link copied to clipboard');
  } catch (e) {
    toast('Room Code: ' + net.code);
  }
};
document.getElementById('mp-leave-btn').onclick = () => net.leave();

// Deep link auto-join
const roomParam = new URLSearchParams(location.search).get('room');
if (roomParam) {
  setTimeout(() => {
    AudioEngine.init();
    net.join(roomParam.trim().toUpperCase());
  }, 1200);
}

// Toast
function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2400);
}

// Window Resize
window.addEventListener('resize', () => {
  const w = window.innerWidth, h = window.innerHeight;
  aspect = w / h;
  updateOrthoCam();

  perspCam.aspect = aspect;
  perspCam.updateProjectionMatrix();

  renderer.setSize(w, h);
});

// Primary Render Loop
function animate() {
  requestAnimationFrame(animate);
  if (camMode !== 'iso') {
    updateAvatarControls();
  }
  renderer.render(scene, activeCamera);
}
animate();
