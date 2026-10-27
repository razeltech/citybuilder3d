# Game Design Document: Pocket Metropolis

## 1. High Concept & Emotional Tone
*Pocket Metropolis* is a relaxing, charming, and thoughtful 2.5D city-building simulation where players design living, sustainable towns. It draws design inspiration from *Townscaper*, *SimCity 2000*, and *Animal Crossing*.

## 2. Economic Pacing & Treasury Replenishment
To prevent burnout and eliminate predatory microtransactions, the economy operates on strategic **Replenishment Cycles**:

### 2.1 The Treasury Engine
- Every placed structure has a **Construction Cost** and a **Net Utility**.
- **Income Generation**:
  - Houses contribute **Tax Revenue** every 45 seconds based on citizen happiness.
  - Commercial shops generate **Trade Coins** when connected by roads to residential zones.
- **Replenishment Breaks**:
  - When the treasury runs low, players can initiate a **Civic Festival** or allow the natural tax clock to tick while exploring their city in 3rd or 1st person street mode.
  - Coins restore organically without paywalls. Good urban planning ensures positive cashflow so players never get stuck.

## 3. Growth Tiers & Milestone Progression
A city advances through 5 distinct growth tiers, unlocking new architecture and regional opportunities:

| Tier | Name | Population Req. | Unlocks |
| :--- | :--- | :--- | :--- |
| **Tier 1** | Pioneer Hamlet | 0 - 25 | Dirt Paths, Basic Houses, Water Well, Small Lawn |
| **Tier 2** | Thriving Village | 26 - 75 | Asphalt Roads, Village Market, Pine Grove, Streetlights |
| **Tier 3** | Market Town | 76 - 200 | Avenue Junctions, Brick Plaza, Fountain, Fire Station |
| **Tier 4** | Coastal / Valley City | 201 - 500 | Multi-Story Flats, Clinic, Solar Plant, Boulevard Lamps |
| **Tier 5** | Capital Metropolis | 500+ | Grand Civic Hall, City Hospital, Regional Transit Terminal |

### 3.1 The Regional Commonwealth (Multi-City Journey)
Once a city achieves Tier 5 (500+ citizens and 85%+ happiness), the player earns the **Regional Charter**. This permits founding an adjacent regional settlement in a new biome:
- **Coastal Estuary**: Water canals, shipping docks, lighthouses.
- **Mountain Quarry**: Terraced rock plateaus, wind power, alpine cabins.
- **Agricultural Plain**: Expansive crop parcels, windmills, farmsteads.

## 4. City Simulation Rules

### 4.1 The Road Connectivity Law
- Every residential and commercial building must be within 1 tile of an active road or pedestrian path.
- Buildings without road access display a disconnected warning symbol and cease producing taxes.

### 4.2 The Happiness Formula
$$\text{Happiness} = \text{Base}(60) + \text{ParkBonus}(+20) + \text{CivicCoverage}(+15) - \text{CongestionPenalty}(-15)$$
- Placing parks and trees within 4 tiles of residences boosts happiness.
- Over-building dense concrete without green foliage drops citizen morale.

### 4.3 Living Agents & Visual Life
- **Pedestrians**: Little retro pixel citizens spawn on sidewalks outside active homes and walk towards plazas, parks, and shops.
- **Vehicles**: Delivery vans, sedans, and emergency trucks drive along the road centerlines, respecting intersections.

## 5. Audio Landscape
- **Acoustic Ambience**: Peaceful 16-bit acoustic guitar, gentle marimba, and environmental nature layers (birdsong, stream ripples, breeze).
- **Tactile SFX**: Low-frequency resonant clicks for road snapping, satisfying pops for structure placement, and cheerful chimes for tier milestones.
