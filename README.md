# 🎮 Gesture Brick Breaker: Pro Overdrive

A production-grade, real-time **3D Hand-Gesture Controlled Brick Breaker** built with Three.js, Rapier3D, and MediaPipe. This version is a complete overhaul featuring advanced feature engineering, special abilities, power-ups, and post-processing.

![Vercel Deployment](https://img.shields.io/badge/Vercel-Deployed-brightgreen) ![Three.js](https://img.shields.io/badge/Three.js-r160-blue) ![Rapier3D](https://img.shields.io/badge/Rapier3D-0.12-orange)

---

## 🚀 Overdrive Features

### 🧠 Advanced Gesture System
Built on a ported Python feature-engineering pipeline, the game detects **5 distinct gestures** with a 5-frame majority-vote buffer to eliminate flicker:
- ✋ **OPEN_HAND**: Default state. Paddle width 10.
- ✊ **FIST**: 2× Score Multiplier active. Paddle width shrinks to 4.
- 🤏 **PINCH**: Triggers **Laser** (5s cooldown) — destroys the first brick in its path.
- 👊 **PUNCH**: Triggers **Smash** (8s cooldown) — 12-unit radial shockwave destruction.
- ✌️ **PEACE**: Triggers **Time Freeze** (1/level) — pauses physics for 2 seconds.

### 🧱 New Brick Ecosystem
- **Type 1 (Cyan)**: 1 hit, standard.
- **Type 2 (Green)**: 2 hits. Shows "cracked" state (yellow) after first hit.
- **Type 3 (Purple)**: EXPLOSIVE. Deals 1 damage to all 8 surrounding bricks on destruction.
- **Type 4 (Magenta)**: REGENERATING. Restores itself 8 seconds after destruction if the level isn't cleared.
- **Type 5 (Orange)**: IMMUNE. Deflects the ball at random angles. Only destroyable by Smash or Laser.

### ⚡ Power-Up Orbs
15% drop chance on brick destruction. 4 types of falling physical orbs:
- 🟡 **MULTIBALL**: Clones the ball twice for 10 seconds.
- 🔵 **MAGNET**: Gentle magnetic pull toward the paddle for 6 seconds.
- 🔴 **NUKE**: Instantly wipes all Cyan and Green bricks on field.
- 🟡 **SCORE SURGE**: 3× Score Multiplier for 8 seconds (stacks with FIST 2×).

### ✨ High-End Visuals
- **Bloom Post-Processing**: UnrealBloomPass provides neon glows for all emissive elements.
- **3D Floating Scores**: Real-time popups at brick positions using `CSS2DRenderer`.
- **Dynamic HUD**: SVG circular arcs tracking ability cooldowns in real-time.
- **Environment**: Procedural starfield and grid floor with dynamic camera shake.

---

## 🕹️ Controls

| Move Hand | Paddle Steering |
|-----------|-----------------|
| **Pinch** | Fire Laser      |
| **Punch** | Perform Smash   |
| **Peace** | Time Freeze     |
| **Fist**  | 2× Points       |

---

## 🌐 Deployment

The game is optimized for **Vercel** with a zero-build setup. 

**Requirements for Rapier3D WASM (SharedArrayBuffer):**
The `vercel.json` file must include these headers to enable the browser's high-security mode:
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" }
      ]
    }
  ]
}
```

---

## 🛠️ Architecture

- `game.js`: Central state machine and physics orchestrator.
- `gestures.js`: Advanced normalization and majority-vote logic.
- `renderer.js`: Post-processed Three.js scene and effect manager.
- `physics.js`: Rapier3D WASM bridge and body creators.
- `levels.js`: Handcrafted (1-15) and procedural (16+) design.
- `powerups.js`: Falling orb and trail logic.
- `ui.js`: DOM, HUD arcs, and LocalStorage leaderboard.

---

## 🤝 Getting Started

1. Open `index.html` in a local server (e.g., `python -m http.server`).
2. Allow Webcam permissions.
3. Use your hand to control the paddle.
4. Chain combos and use abilities to reach the Hall of Fame.

---

**Built with ❤️ and advanced geometry.**
