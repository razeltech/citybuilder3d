import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import Peer from 'peerjs';

/* ==========================================================================
   1. Configuration & Asset Registry
   ========================================================================== */
const GRID_SIZE = 40;
const TILE_SIZE = 2; // Matches Kenney 2x2 grid units
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
  'road-straight': { name: 'Straight Road', file: 'road-straight.glb', cat: 'roads', pop: 0 },
  'road-corner': { name: 'Corner Turn', file: 'road-corner.glb', cat: 'roads', pop: 0 },
  'road-intersection': { name: '4-Way Junction', file: 'road-intersection.glb', cat: 'roads', pop: 0 },
  'road-split': { name: 'T-Split Road', file: 'road-split.glb', cat: 'roads', pop: 0 },
  'road-straight-lightposts': { name: 'Boulevard Lights', file: 'road-straight-lightposts.glb', cat: 'roads', pop: 0 },
  
  // Buildings
  'building-small-a': { name: 'Apartments A', file: 'building-small-a.glb', cat: 'buildings', pop: 24 },
  'building-small-b': { name: 'Commerce Loft', file: 'building-small-b.glb', cat: 'buildings', pop: 18 },
  'building-small-c': { name: 'High-Rise Unit', file: 'building-small-c.glb', cat: 'buildings', pop: 45 },
  'building-small-d': { name: 'Suburban Villa', file: 'building-small-d.glb', cat: 'buildings', pop: 12 },
  'building-garage': { name: 'Civic Depot', file: 'building-garage.glb', cat: 'buildings', pop: 8 },

  // Parks & Nature
  'grass-trees': { name: 'Community Grove', file: 'grass-trees.glb', cat: 'parks', pop: 0 },
  'grass-trees-tall': { name: 'Pine Reserve', file: 'grass-trees-tall.glb', cat: 'parks', pop: 0 },
  'grass': { name: 'Lawn Parcel', file: 'grass.glb', cat: 'parks', pop: 0 },

  // Plazas & Civic
  'pavement': { name: 'Pedestrian Walk', file: 'pavement.glb', cat: 'pavement', pop: 0 },
  'pavement-fountain': { name: 'Central Fountain', file: 'pavement-fountain.glb', cat: 'pavement', pop: 5 }
};

/* ==========================================================================
   2. Audio Engine (Decoupled SFX & Ambient Bus)
   ========================================================================== */
const AudioEngine = (() => {
  let ctx, gFx, gAmb;
  let bgmBuffer = null;
  let bgmSource = null;
  const sfxBuffers = {};
  let sfxOn = true, bgmOn = true;

  const init = async () => {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    ctx = new AudioCtx();

    gFx = ctx.createGain();
    gFx.gain.value = sfxOn ? 0.8 : 0;
    gFx.connect(ctx.destination);

    gAmb = ctx.createGain();
    gAmb.gain.value = bgmOn ? 0.5 : 0;
    gAmb.connect(ctx.destination);

    // Preload sound files
    loadSound('assets/sounds/ambience.ogg').then(buf => {
      bgmBuffer = buf;
      if (bgmOn) startBgm();
    });

    ['placement-a', 'placement-b', 'placement-c', 'placement-d',
     'removal-a', 'removal-b', 'rotate', 'toggle'].forEach(key => {
      loadSound(`assets/sounds/${key}.ogg`).then(buf => { sfxBuffers[key] = buf; });
    });
  };

  const loadSound = async (url) => {
    try {
      const res = await fetch(url);
      const arr = await res.arrayBuffer();
      return await ctx.decodeAudioData(arr);
    } catch (e) {
      return null;
    }
  };

  const playSfx = (key) => {
    if (!ctx || !sfxOn || !sfxBuffers[key]) return;
    try {
      const s = ctx.createBufferSource();
      s.buffer = sfxBuffers[key];
      s.connect(gFx);
      s.start();
    } catch (e) {}
  };

  const startBgm = () => {
    if (!ctx || !bgmBuffer || bgmSource) return;
    try {
      bgmSource = ctx.createBufferSource();
      bgmSource.buffer = bgmBuffer;
      bgmSource.loop = true;
      bgmSource.connect(gAmb);
      bgmSource.start();
    } catch (e) {}
  };

  const stopBgm = () => {
    if (bgmSource) {
      try { bgmSource.stop(); } catch (e) {}
      bgmSource = null;
    }
  };

  return {
    init,
    playPlace() {
      const variants = ['placement-a', 'placement-b', 'placement-c', 'placement-d'];
      playSfx(variants[Math.floor(Math.random() * variants.length)]);
    },
    playDemolish() {
      const variants = ['removal-a', 'removal-b'];
      playSfx(variants[Math.floor(Math.random() * variants.length)]);
    },
    playRotate() { playSfx('rotate'); },
    playToggle() { playSfx('toggle'); },
    toggleSfx(val) {
      sfxOn = val;
      if (gFx && ctx) gFx.gain.setValueAtTime(sfxOn ? 0.8 : 0, ctx.currentTime);
      return sfxOn;
    },
    toggleBgm(val) {
      bgmOn = val;
      if (gAmb && ctx) gAmb.gain.setValueAtTime(bgmOn ? 0.5 : 0, ctx.currentTime);
      if (bgmOn && !bgmSource) startBgm();
      else if (!bgmOn && bgmSource) stopBgm();
      return bgmOn;
    }
  };
})();

/* ==========================================================================
   3. Three.js Scene, Renderer & Lighting Setup
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
scene.background = new THREE.Color('#0c0f1a');
scene.fog = new THREE.FogExp2('#0c0f1a', 0.012);

// Sun & Ambient Lighting
const hemiLight = new THREE.HemisphereLight(0xddeeff, 0x182030, 0.95);
const dirLight = new THREE.DirectionalLight(0xfffaed, 1.8);
dirLight.position.set(24, 40, 18);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 120;
const d = 36;
dirLight.shadow.camera.left = -d;
dirLight.shadow.camera.right = d;
dirLight.shadow.camera.top = d;
dirLight.shadow.camera.bottom = -d;
dirLight.shadow.bias = -0.0004;

scene.add(hemiLight, dirLight);

// Ground Grid
const gridHelper = new THREE.GridHelper(GRID_SIZE * TILE_SIZE, GRID_SIZE, 0x00f0ff, 0x1f293d);
gridHelper.position.y = 0.01;
scene.add(gridHelper);

const groundGeo = new THREE.PlaneGeometry(GRID_SIZE * TILE_SIZE, GRID_SIZE * TILE_SIZE);
groundGeo.rotateX(-Math.PI / 2);
const groundMat = new THREE.MeshStandardMaterial({
  color: 0x111625,
  roughness: 0.85,
  metalness: 0.1
});
const groundMesh = new THREE.Mesh(groundGeo, groundMat);
groundMesh.receiveShadow = true;
scene.add(groundMesh);

/* ==========================================================================
   4. Camera Controller (Isometric, 3rd Person, 1st Person)
   ========================================================================== */
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.2, 500);
const orbit = new OrbitControls(camera, canvas);
orbit.enableDamping = true;
orbit.dampingFactor = 0.06;
orbit.maxPolarAngle = Math.PI / 2 - 0.05;
orbit.minDistance = 6;
orbit.maxDistance = 140;

// Camera states
let camMode = 'iso'; // 'iso', 'third', 'first'
const avatarGroup = new THREE.Group();
const avatarBody = new THREE.Mesh(
  new THREE.CylinderGeometry(0.35, 0.35, 1.4, 8),
  new THREE.MeshStandardMaterial({ color: 0x00f0ff, roughness: 0.3, metalness: 0.8 })
);
avatarBody.position.y = 0.7;
avatarBody.castShadow = true;
avatarGroup.add(avatarBody);
const avatarHead = new THREE.Mesh(
  new THREE.SphereGeometry(0.28, 8, 8),
  new THREE.MeshStandardMaterial({ color: 0xffdf00, roughness: 0.2, metalness: 0.4 })
);
avatarHead.position.y = 1.55;
avatarHead.castShadow = true;
avatarGroup.add(avatarHead);
scene.add(avatarGroup);
avatarGroup.position.set(0, 0, 0);

function setCamMode(mode) {
  camMode = mode;
  document.querySelectorAll('.cam-modes .retro-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cam === mode);
  });

  if (mode === 'iso') {
    orbit.enabled = true;
    avatarGroup.visible = false;
    camera.position.set(18, 22, 24);
    orbit.target.set(0, 0, 0);
    orbit.update();
  } else if (mode === 'third') {
    orbit.enabled = false;
    avatarGroup.visible = true;
  } else if (mode === 'first') {
    orbit.enabled = false;
    avatarGroup.visible = false;
  }
  toast(`Camera Mode: ${mode.toUpperCase()}`);
}
setCamMode('iso');

/* ==========================================================================
   5. GLTF Model Loader & Grid Placement
   ========================================================================== */
const loader = new GLTFLoader();
const modelPrototypes = {};
const cityGrid = new Map(); // key: `x,z` -> { id, rotation, mesh }
let currentSelectedId = 'building-small-a';
let currentRotation = 0; // 0, 1, 2, 3 (each * 90 deg)
let isDemolishMode = false;

// Preload Kenney Models
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
    modelPrototypes[key] = root;
    loadedCount++;
    if (loadedCount === modelFiles.length) {
      initPaletteUI();
      updateGhostPreview();
    }
  });
});

// Ghost Placement Preview
const ghostMat = new THREE.MeshBasicMaterial({
  color: 0x00f0ff,
  transparent: true,
  opacity: 0.45,
  wireframe: true
});
let ghostMesh = new THREE.Group();
scene.add(ghostMesh);

function updateGhostPreview() {
  while (ghostMesh.children.length) ghostMesh.remove(ghostMesh.children[0]);
  if (isDemolishMode) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(TILE_SIZE * 0.95, 0.4, TILE_SIZE * 0.95), new THREE.MeshBasicMaterial({ color: 0xff3366, transparent: true, opacity: 0.5 }));
    box.position.y = 0.2;
    ghostMesh.add(box);
    return;
  }
  const proto = modelPrototypes[currentSelectedId];
  if (!proto) return;
  const clone = proto.clone(true);
  clone.traverse(child => {
    if (child.isMesh) child.material = ghostMat;
  });
  clone.rotation.y = currentRotation * (Math.PI / 2);
  ghostMesh.add(clone);
}

// Grid Coordinates Helper
const snapToGrid = (coord) => Math.floor((coord + TILE_SIZE / 2) / TILE_SIZE) * TILE_SIZE;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredTile = { x: 0, z: 0 };

function getRaycastIntersection(e) {
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObject(groundMesh);
  return hits.length ? hits[0].point : null;
}

canvas.addEventListener('pointermove', (e) => {
  if (camMode !== 'iso') return;
  const pt = getRaycastIntersection(e);
  if (!pt) {
    ghostMesh.visible = false;
    return;
  }
  const gx = snapToGrid(pt.x);
  const gz = snapToGrid(pt.z);
  hoveredTile = { x: gx, z: gz };
  ghostMesh.position.set(gx, 0, gz);
  ghostMesh.visible = true;

  document.getElementById('hud-coord').textContent = `X: ${gx / TILE_SIZE}, Z: ${gz / TILE_SIZE}`;
});

function placeStructure(id, x, z, rot, isRemote = false) {
  const key = `${x},${z}`;
  if (cityGrid.has(key)) {
    if (!isRemote) toast('Parcel already occupied! Bulldoze first.');
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

canvas.addEventListener('pointerdown', (e) => {
  if (camMode !== 'iso' || e.button !== 0) return;
  const pt = getRaycastIntersection(e);
  if (!pt) return;

  const gx = snapToGrid(pt.x);
  const gz = snapToGrid(pt.z);

  if (isDemolishMode) {
    demolishStructure(gx, gz);
  } else {
    placeStructure(currentSelectedId, gx, gz, currentRotation);
  }
});

function updateCityStats() {
  let population = 0;
  cityGrid.forEach(entry => {
    const s = STRUCTURES[entry.id];
    if (s && s.pop) population += s.pop;
  });
  document.getElementById('hud-pop').textContent = population;
  document.getElementById('hud-structs').textContent = cityGrid.size;
}

/* ==========================================================================
   6. First/Third Person Street Movement
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
    AudioEngine.playToggle();
    toast(isDemolishMode ? 'BULLDOZER ACTIVE' : 'BUILD MODE ACTIVE');
  }
});
window.addEventListener('keyup', (e) => { keysDown[e.code] = false; });

let avatarYaw = 0;
const avatarSpeed = 0.18;

function updateAvatarControls() {
  if (camMode === 'iso') return;

  const forward = (keysDown['KeyW'] || keysDown['ArrowUp'] ? 1 : 0) - (keysDown['KeyS'] || keysDown['ArrowDown'] ? 1 : 0);
  const turn = (keysDown['KeyA'] || keysDown['ArrowLeft'] ? 1 : 0) - (keysDown['KeyD'] || keysDown['ArrowRight'] ? 1 : 0);

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
    const camOffset = new THREE.Vector3(0, 2.2, 4.2).applyAxisAngle(new THREE.Vector3(0, 1, 0), avatarYaw);
    camera.position.copy(avatarGroup.position).add(camOffset);
    camera.lookAt(avatarGroup.position.clone().add(new THREE.Vector3(0, 1.2, 0)));
  } else if (camMode === 'first') {
    camera.position.copy(avatarGroup.position).add(new THREE.Vector3(0, 1.5, 0));
    const lookTarget = camera.position.clone().add(new THREE.Vector3(-Math.sin(avatarYaw), 0, -Math.cos(avatarYaw)).multiplyScalar(10));
    camera.lookAt(lookTarget);
  }
}

/* ==========================================================================
   7. PeerJS 1-4 Player Cooperative WebRTC Mesh
   ========================================================================== */
const remoteAvatars = new Map(); // peerId -> THREE.Mesh

function createRemoteAvatarMesh() {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.4, 8), new THREE.MeshStandardMaterial({ color: 0xffdf00, roughness: 0.4 }));
  b.position.y = 0.7;
  g.add(b);
  const h = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), new THREE.MeshStandardMaterial({ color: 0x00f0ff, roughness: 0.3 }));
  h.position.y = 1.55;
  g.add(h);
  scene.add(g);
  return g;
}

const code5 = () => Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');

const net = {
  peer: null,
  connections: new Map(), // peerId -> DataConnection
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
      this.updatePeersUI();
      toast('City room created: ' + this.code);
    });

    p.on('connection', conn => {
      if (this.connections.size >= 3) {
        conn.close();
        return;
      }
      this.attachConn(conn);
    });

    p.on('error', err => {
      if (err.type === 'unavailable-id') this.host();
      else toast('Connection error: ' + (err.type || 'network'));
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
      toast('Connected to city room ' + this.code);
    });

    p.on('error', err => toast('City room not found'));
  },

  attachConn(conn) {
    this.connections.set(conn.peer, conn);
    conn.on('open', () => {
      this.updatePeersUI();
      // If host, send current city snapshot
      if (this.isHost) {
        const snapshot = [];
        cityGrid.forEach((entry, key) => {
          const [x, z] = key.split(',').map(Number);
          snapshot.push({ id: entry.id, x, z, rot: entry.rotation });
        });
        conn.send({ t: 'sync', city: snapshot });
      }
    });

    conn.on('data', data => {
      if (data.t === 'sync') {
        data.city.forEach(item => placeStructure(item.id, item.x, item.z, item.rot, true));
      } else if (data.t === 'place') {
        placeStructure(data.id, data.x, data.z, data.rot, true);
      } else if (data.t === 'remove') {
        demolishStructure(data.x, data.z, true);
      } else if (data.t === 'move') {
        let avatar = remoteAvatars.get(conn.peer);
        if (!avatar) {
          avatar = createRemoteAvatarMesh();
          remoteAvatars.set(conn.peer, avatar);
        }
        avatar.position.set(data.x, 0, data.z);
        avatar.rotation.y = data.yaw;
      } else if (data.t === 'bye') {
        this.removePeer(conn.peer);
        toast('A builder left the city');
      }
    });

    conn.on('close', () => this.removePeer(conn.peer));
    conn.on('error', () => this.removePeer(conn.peer));
  },

  removePeer(peerId) {
    this.connections.delete(peerId);
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
    toast('Disconnected from multiplayer city');
  },

  updatePeersUI() {
    const list = document.getElementById('mp-peers-list');
    if (!list) return;
    list.innerHTML = '';
    const myPill = document.createElement('div');
    myPill.textContent = 'YOU (' + (this.isHost ? 'Host' : 'Guest') + ')';
    myPill.className = 'peer-pill';
    list.appendChild(myPill);

    this.connections.forEach((_, id) => {
      const p = document.createElement('div');
      p.textContent = 'Builder ' + id.slice(-4);
      p.className = 'peer-pill';
      list.appendChild(p);
    });
  }
};

/* ==========================================================================
   8. UI Bindings & Retro Palette Dock
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
      AudioEngine.playToggle();
    };
    container.appendChild(card);
  });
}

document.querySelectorAll('.cat-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    initPaletteUI();
    AudioEngine.playToggle();
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
  AudioEngine.playToggle();
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
  document.getElementById('scanlines').hidden = !pixelFxOn;
  renderer.setPixelRatio(pixelFxOn ? 0.45 : Math.min(window.devicePixelRatio, 2));
  toast(pixelFxOn ? 'Retro Pixel FX: ACTIVE' : 'Retro Pixel FX: OFF');
};

// Day / Night Toggle
let isNight = true;
document.getElementById('btn-day-night').onclick = () => {
  isNight = !isNight;
  const btn = document.getElementById('btn-day-night');
  btn.textContent = isNight ? 'NIGHT' : 'DAY';
  scene.background.set(isNight ? '#0c0f1a' : '#9bd4ff');
  scene.fog.color.set(isNight ? '#0c0f1a' : '#9bd4ff');
  dirLight.intensity = isNight ? 1.0 : 2.4;
  hemiLight.intensity = isNight ? 0.6 : 1.2;
};

// Audio Controls
document.getElementById('btn-sfx').onclick = () => {
  const on = AudioEngine.toggleSfx(!AudioEngine.sfxOn);
  document.getElementById('btn-sfx').textContent = on ? 'SFX: ON' : 'SFX: OFF';
  toast(on ? 'Sound Effects ON' : 'Sound Effects Muted');
};
document.getElementById('btn-bgm').onclick = () => {
  const on = AudioEngine.toggleBgm(!AudioEngine.bgmOn);
  document.getElementById('btn-bgm').textContent = on ? 'BGM: ON' : 'BGM: OFF';
  toast(on ? 'Ambience Music ON' : 'Ambience Music Muted');
};

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
    toast('Code: ' + net.code);
  }
};
document.getElementById('mp-leave-btn').onclick = () => net.leave();

// Deep link auto-join
const roomParam = new URLSearchParams(location.search).get('room');
if (roomParam) {
  setTimeout(() => {
    AudioEngine.init();
    net.join(roomParam.trim().toUpperCase());
  }, 1000);
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
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Primary Render Loop
window.addEventListener('pointerdown', () => AudioEngine.init(), { once: true });

function animate() {
  requestAnimationFrame(animate);
  if (camMode === 'iso') {
    orbit.update();
  } else {
    updateAvatarControls();
  }
  renderer.render(scene, camera);
}
animate();
