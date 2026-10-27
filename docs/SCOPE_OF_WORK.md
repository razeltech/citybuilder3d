# Scope of Work (SOW): Pocket Metropolis 3D / 2.5D

## 1. Project Identity & Overview
- **Project Name**: Pocket Metropolis (CityBuilder 3D)
- **Repository**: `https://github.com/razeltech/citybuilder3d.git`
- **Production URL**: `https://razeltech.github.io/citybuilder3d/`
- **Lead Architect**: AI Pair Programmer (Engineering Lead)
- **Game Testers & QA**: User & Testing Partner (5 Hours Daily Dedicated Testing Sprints)
- **Project Target Window**: 7-Day Sprint to Feature-Complete Release

## 2. Core Pillars
1. **Ad-Free, Meaningful Long-Term Gameplay**:
   - Zero intrusive advertisements, zero predatory microtransactions, zero artificial progression walls.
   - Organic economic pacing based on city treasury, citizen taxes, and natural productivity replenishment.
2. **Tactile 2.5D / Isometric World with Living Simulation**:
   - True orthographic/isometric perspective with rich ground textures, road snapping, and active citizens/vehicles.
   - Multi-perspective switchability: Aerial Builder Mode, 3rd Person Citizen Follow, and 1st Person Street Walker.
3. **Cooperative 1-4 Player P2P Multiplayer & Offline Independence**:
   - Fully playable offline (Single Player PWA) with local IndexedDB persistence.
   - P2P WebRTC mesh networking (1-4 players) with instantaneous room codes, deep-link invite URLs, and direct peer voice communication.
4. **Multi-City Regional Commonwealth**:
   - City state serialization allowing players to grow a town to regional maturity, archive it in their local ledger, and found new biomes (Valley, Coastal Port, Desert Oasis, Alpine Ridge).

## 3. Scope Inclusions (Deliverables)
- **Engine Core**: Lightweight Three.js r186 WebGL renderer with custom orthographic pixelation pipeline, deterministic tile grid, and instanced Kenney CC0 model rendering.
- **Simulation Layer**:
  - Road network connectivity graph (BFS route finding).
  - Power and water infrastructure proximity checks.
  - Happiness Index computation based on green space (parks/trees) vs industrial pollution.
  - Citizen and vehicle micro-simulation agents along paved road nodes.
- **Economic Loop**:
  - Treasury coins replenished via dynamic citizen tax cycles and commercial production intervals.
  - Strategic milestone unlocks (Small Settlement -> Village -> Market Town -> Industrial Hub -> Metropolis).
- **Networking & Voice**:
  - PeerJS mesh topology with Google and Twilio STUN servers for robust NAT traversal.
  - Local microphone streaming via WebRTC MediaStreams with push-to-talk / voice activity toggle and clean audio cleanup.
  - Atomic action synchronization (`place`, `demolish`, `rotate`, `chat`, `avatar_move`).
- **Data Persistence**:
  - Centralized schema-validated IndexedDB repository with automated dirty-flag auto-saves, manual JSON export/import, and multi-slot city management.
- **User Interface**:
  - Ergonomic responsive HUD adapting seamlessly between mobile portrait, mobile landscape, tablet, and desktop 4K displays.
  - No generic AI gradients; restrained retro gaming palette with high-contrast accessibility.

## 4. Scope Exclusions (Non-Goals)
- No server-side relational databases or mandatory user accounts.
- No third-party ad networks or tracking scripts.
- No heavy frontend frameworks (React/Vue/Angular) to guarantee ultra-fast initial load times (< 2 seconds).
