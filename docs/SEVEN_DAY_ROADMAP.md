# 7-Day Sprint Roadmap & Testing Protocol

## Working Routine
- **Daily Schedule**: 5 Hours Dedicated Development & QA Sprints.
- **Roles**:
  - Engineering Lead: Core Engine, Shaders, Networking, Persistence, Audio.
  - Game Testers (User & Testing Partner): Balance testing, multi-device UX verification, WebRTC network validation, bug logging.

---

### Day 1: Groundwork & Spatial Foundation (Current)
- Complete Project Architecture, Scope of Work, and Game Design Documentation.
- Establish living terrain canvas (textured lush grass with varied green tone tiles).
- Overhaul camera controller to authentic 2.5D Isometric perspective with smooth zoom/pan and coordinate locking.
- Eliminate harsh audio generators; integrate peaceful acoustic ambient bus.

### Day 2: The Grid & Auto-Connecting Road Engine
- Implement 2D tile graph with intelligent auto-tiling roads (straight, corner, T-split, intersection).
- Implement structure placement, rotation (`[R]`), and bulldozer demolition (`[X]`).
- Add road-to-building adjacency detection algorithm with visual disconnected alerts.
- **Testing Gate**: Testers lay out a 10x10 street block on mobile and desktop; confirm zero placement clipping.

### Day 3: Simulation Engine, Economy & Living Citizens
- Build deterministic 1Hz simulation tick (Treasury, Population, Happiness).
- Implement coin production, citizen tax replenishment intervals, and upgrade tiers.
- Spawn wandering pedestrian pixel agents on sidewalks and cars on road paths.
- **Testing Gate**: Testers play a continuous 30-minute economy loop to verify treasury balance and happiness calculations.

### Day 4: Rock-Solid WebRTC Multiplayer & Voice Integration
- Implement PeerJS 1-4 player mesh networking with Google/Twilio STUN servers.
- Wire real-time WebRTC audio voice chat with push-to-talk and speaking indicators.
- Synchronize building placement, demolition, and real-time remote player avatars.
- Seamless deep-link sharing (`?room=CODE`) with zero race conditions.
- **Testing Gate**: Testers connect on two separate devices/networks; verify smooth 2-player building and clear voice chat.

### Day 5: Multi-Perspective Exploration (1st & 3rd Person Walker)
- Implement street-level character avatar with customizable retro colors.
- First-person walking mode with smooth mouse-look / touch virtual joystick.
- Third-person follow camera traversing streets, plazas, and parks.
- **Testing Gate**: Testers walk down built avenues in 1st person mode; test collision and obstacle handling.

### Day 6: Multi-City Regional Ledger & Offline Persistence
- Build IndexedDB multi-slot storage engine with automated dirty-flag saves.
- Implement City Catalog: Switch between different cities and founding new regional biomes.
- JSON city file export and import for offline backups.
- PWA manifest and service worker cache for 100% offline gameplay.
- **Testing Gate**: Testers build a city, close browser, disconnect Wi-Fi, reload, and verify 100% data preservation.

### Day 7: Final Polish, Balance Tuning & Production Release
- Refine mobile touch ergonomics (drag-to-build, pinch-to-zoom, floating minimal palette).
- Final sound design balance (placement pops, milestone fanfares, ambient loops).
- Full browser QA pass (Chrome, Safari iOS, Firefox, Android).
- Production deployment to GitHub Pages and public release documentation.
