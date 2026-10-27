# Technical Architecture & System Design

## 1. Architectural Philosophy
The system enforces strict separation of concerns across six decoupled modules:

```
       [ User Inputs (Mouse / Touch / Keys / Gamepad) ]
                                |
                                v
      [ UI Adapter & View Layer (HUD / Tool Dock / Modals) ]
                                |
                                v
               [ Game State Store & Event Bus ]
             /                 |                \
            v                  v                 v
[ Simulation Core ]    [ 3D Rendering (Three.js) ]   [ Network (PeerJS) ]
        |                      |                           |
        v                      v                           v
[ Spatial Grid Graph ]   [ Viewport & Cameras ]    [ WebRTC Mesh (1-4) ]
        |                      |                           |
        +----------------------+---------------------------+
                               |
                               v
               [ Persistence Layer (IndexedDB) ]
```

## 2. Module Specifications

### 2.1 Core Simulation Engine (`src/core/sim.js`)
- **Spatial Grid**: Centralized `Map<string, Cell>` where key is hashed grid coordinates `"x,z"`.
- **Connectivity Graph**: Adjacency list storing road connections. Structures must trace an uninterrupted path to the Town Hall / Service Hub to remain operational.
- **Tick Loop**: Runs at deterministic 1Hz intervals independent of the render frame rate (60fps):
  - Step 1: Update treasury balance by calculating net income (`taxes_collected - municipal_upkeep`).
  - Step 2: Evaluate citizen happiness based on park proximity, noise radius, and service coverage.
  - Step 3: Spawn or despawn visual pedestrian and vehicular agents.

### 2.2 3D Viewport & Rendering Pipeline (`src/core/render.js`)
- **Renderer**: WebGLRenderer with ACESFilmic tone mapping, PCF shadow maps, and sRGB color space.
- **Camera System**:
  - `OrthographicCamera` for true 2.5D isometric view with pixel-perfect grid alignment.
  - `PerspectiveCamera` for 3rd Person and 1st Person avatar street exploration.
- **Pixelation Shading Engine**:
  - Dynamic resolution scaler adjusting `renderer.setPixelRatio()` with nearest-neighbor CSS texture filtering (`image-rendering: pixelated`) to achieve authentic retro arcade aesthetics.

### 2.3 PeerJS WebRTC Mesh Networking (`src/net/mesh.js`)
- **Topology**: Full mesh topology for 1 to 4 players.
  - Player 1 (Host) establishes `cb3d-XXXXX`.
  - Players 2-4 connect to Host; Host announces existing peer IDs so clients establish mutual direct data channels and audio streams.
- **STUN Infrastructure**:
  ```javascript
  const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ];
  ```
- **Protocol Envelopes**:
  - `{ t: 'sync', city: [...] }`: Initial full state dump sent to joining peers.
  - `{ t: 'place', id, x, z, rot, owner }`: Atomic structure placement.
  - `{ t: 'demolish', x, z }`: Atomic structure removal.
  - `{ t: 'move', id, x, z, yaw }`: Real-time builder avatar telemetry (throttled to 20Hz).
  - `{ t: 'bye' }`: Graceful peer teardown with instant UI notification.

### 2.4 Real-Time WebRTC Voice Chat (`src/net/voice.js`)
- **Media Pipeline**:
  - `navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })`.
  - Stream transmitted via `peer.call(remotePeerId, localStream)`.
  - Audio routed through Web Audio API `MediaStreamAudioSourceNode` -> GainNode (Volume / Mute) -> Destination.
- **Lifecycle Guarantees**: Complete track termination (`track.stop()`) upon leaving or toggling mute.

### 2.5 Data Persistence & Storage Schema (`src/storage/db.js`)
- **Primary Engine**: IndexedDB with fallback to JSON LocalStorage.
- **Schema Specification**:
```json
{
  "id": "city_valley_01",
  "name": "Emerald Ridge",
  "version": 1,
  "createdAt": 1793110000000,
  "lastSavedAt": 1793112000000,
  "treasury": 1450,
  "population": 84,
  "happiness": 88,
  "grid": [
    { "x": 0, "z": 0, "id": "town-hall", "rot": 0 },
    { "x": 2, "z": 0, "id": "road-straight", "rot": 1 },
    { "x": 2, "z": 2, "id": "building-small-a", "rot": 0 }
  ],
  "unlockedTiers": ["settlement", "village"]
}
```
