# UI/UX Design System Specification

## 1. Aesthetic Identity: Clean Retro Arcade & Architectural Minimal
The interface avoids generic AI gradients, neon glows, and emojis. It uses a restrained, high-contrast dark palette inspired by high-end CAD tools and classic pixel games (*SimCity 2000*, *Advance Wars*).

## 2. Color Tokens
- **Canvas Base**: `#0a0d14` (Deep Obsidian Charcoal)
- **Card Surfaces**: `#121622` (Matte Slate Surface) with `1px solid rgba(255, 255, 255, 0.08)`
- **Primary Accent**: `#00f0ff` (Arcade Cyan) — Used for active selection, road markers, and grid highlights.
- **Economic Gold**: `#ffdf00` (Treasury Amber) — Used for coin balance, tax alerts, and milestone badges.
- **Eco Mint**: `#00ff88` (Citizen Happiness) — Used for positive happiness and green zone indicators.
- **Warning Crimson**: `#ff3366` (Demolish / Alert) — Used for bulldozing and disconnected road warnings.
- **Text Ink**: `#f0f6fc` (High-contrast pure white) / `#8b949e` (Muted slate caption).

## 3. Typography Hierarchy
- **Header Badges & Arcade Titles**: Google Fonts `Press Start 2P` (8px - 11px, high letter spacing, all-caps).
- **Numbers, Coordinates & Financial Data**: Google Fonts `Space Mono` (11px - 14px, bold monospace).
- **Body & Storyboard Text**: `Space Mono` / System Monospace (12px, clean line height 1.5).

## 4. Multi-Device Layout Ergonomics

### 4.1 Mobile Viewport (< 640px)
- Top bar contains only the Brand mark, Treasury pill, and Settings gear icon.
- Bottom palette transforms into a thumb-friendly horizontal scroll dock with large touch targets (min 48px).
- Dual virtual thumbsticks appear automatically when switching to 1st/3rd person walker mode.

### 4.2 Desktop & Tablet (> 640px)
- Floating glassmorphic dock anchored at the bottom center.
- Top navigation bar displays quick camera pills (Aerial, 3rd Person, 1st Person), audio controls, and multiplayer status.
- Keybinding shortcuts displayed on palette items (`[1]` through `[5]`, `[R]` rotate, `[X]` bulldoze).
