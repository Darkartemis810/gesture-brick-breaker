# 🎮 Gesture Brick Breaker

A fully browser-based, real-time **3D Brick Breaker** game where you control the paddle entirely through **webcam hand gestures**. No plugins, no server — everything runs client-side using WebGL and WebAssembly.

![Gesture Brick Breaker](https://img.shields.io/badge/Three.js-r160-blue) ![Rapier3D](https://img.shields.io/badge/Rapier3D-0.12-green) ![MediaPipe](https://img.shields.io/badge/MediaPipe-Hands-orange)

---

## 🚀 Quick Start

```bash
# Clone the repo
git clone https://github.com/Darkartemis810/gesture-brick-breaker.git
cd gesture-brick-breaker

# Start a local server (any of these work)
python -m http.server 3000
# or
npx http-server -c-1

# Open in browser
http://localhost:3000
```

> **Important**: You need a webcam for gesture control. Allow camera permissions when prompted.

---

## 🕹️ How to Play

### Controls

| Gesture | Action |
|---------|--------|
| ✋ **Any Hand Visible** | Paddle follows your hand position left/right |
| ✊ **Closed Fist** | Paddle follows hand (same as open — always active) |
| 👊 **Punch Forward** | **SMASH MODE** — Destroys 3 nearest bricks instantly (8s cooldown) |

### Gameplay Loop

1. **Allow webcam access** when the browser asks.
2. Hold your hand in front of the camera until the side panel says **"TRACKING"** or **"CONTROLLING"**.
3. Click the **Start Game** button.
4. The ball launches automatically — move your hand left/right to steer the paddle.
5. Bounce the ball off the paddle to destroy bricks.
6. Clear all bricks to advance to the next level.
7. You have **3 lives** — if the ball passes your paddle, you lose one.
8. When all lives are lost, click **"Play Again"** to restart.

---

## 🏗️ Game Mechanics

### 🏐 Ball Physics
- The ball moves at a constant normalized speed that increases slightly with each level (`baseSpeed × (1 + level × 0.08)`).
- Ball is constrained to a 2D plane (Y is locked at 0.6).
- **Anti-stuck logic**: If the ball gets trapped moving horizontally (Z velocity < 1.0), it gets a nudge to break free.
- **Strict boundary clamping**: The ball is forcefully kept within the visible field. If it escapes X or Z bounds, it's teleported back and its velocity is reflected.
- Ball bouncing angle off the paddle depends on **where** it hits:
  - Center hit → ball goes straight up
  - Edge hit → ball bounces at up to ~51° angle

### 🧱 Bricks
- Each level has a **10-column grid** of bricks.
- Brick types (1–5) determine their **color**:
  - `1` = 🔵 Cyan
  - `2` = 🟢 Neon Green
  - `3` = 🟣 Purple
  - `4` = 🩷 Magenta
  - `5` = 🟠 Orange
- All bricks are destroyed in one hit.
- Destroyed bricks spawn **4 debris fragments** that fly outward with physics-based impulse and fade over 2.5 seconds.

### 🏓 Paddle
- Width: **7 units** (slightly wider than standard for accessibility).
- Kinematic body — moved by your hand's X position.
- The paddle is **clamped** within the field boundaries so it can't escape off-screen.
- Has a glowing **cyan point light** attached for visual flair.

### 💥 Smash Mode
- Triggered by **punching forward** (detected via wrist Z-depth velocity).
- Destroys the **3 nearest active bricks** instantly.
- **8-second cooldown** between smashes.
- Triggers a **magenta screen flash** effect.

---

## 🎯 Scoring System

### Base Points
| Action | Points |
|--------|--------|
| Destroy Brick (Type 1) | 50 × combo |
| Destroy Brick (Type 2) | 100 × combo |
| Destroy Brick (Type 3) | 150 × combo |
| Destroy Brick (Type 4) | 200 × combo |
| Destroy Brick (Type 5) | 250 × combo |
| Smash Brick | 200 × combo |
| Level Clear Bonus | 1000 × level number |

### Combo System
- Every brick destroyed increases your **combo multiplier** by 1.
- Combos **reset to x1** if you go **3 seconds** without hitting a brick.
- Combos also reset when you **lose a life**.
- At **x3+ combo**, a floating popup shows: `x3 COMBO! +450`.
- Chain hits quickly to rack up massive scores!

**Example combo chain:**
```
Hit 1: 50 × 1 = 50     (combo x1)
Hit 2: 100 × 2 = 200   (combo x2)
Hit 3: 150 × 3 = 450   (combo x3 — popup appears!)
Hit 4: 50 × 4 = 200    (combo x4)
...keep chaining for exponential scores!
```

---

## 🗺️ Levels

The game ships with **5 levels** that loop infinitely with increasing ball speed:

### Level 1 — Full Wall
```
██████████
██████████
██████████
██████████
██████████
```
50 bricks. Simple intro — smash everything!

### Level 2 — Checkerboard
```
█ █ █ █ █ 
 █ █ █ █ █
█ █ █ █ █ 
 █ █ █ █ █
█ █ █ █ █ 
 █ █ █ █ █
```
30 bricks. The gaps let the ball pass through unpredictably.

### Level 3 — Fortress
```
██████████
█        █
█ ██████ █
█ █    █ █
█ ██████ █
█        █
██████████
```
40 bricks. You need to break through the outer walls first.

### Level 4 — Arrow
```
    ██    
   ████   
  ██████  
 ████████ 
██████████
 ████████ 
  ██████  
   ████   
```
56 bricks. Dense expanding/contracting pattern.

### Level 5 — Zigzag
```
███   ███
  ██ ██  
   ███   
  ████   
 ██  ██  
██  ██ ██
██████████
```
38 bricks. Mixed colors and tricky angles.

After Level 5, levels loop back to Level 1 with **faster ball speed**.

---

## 🎨 Visual Effects

- **Neon glow** on paddle, ball, and bricks using emissive materials
- **Point lights** attached to ball and paddle for dynamic lighting
- **Debris fragments** on brick destruction (physics-simulated with fade-out)
- **Screen flash** on Smash Mode activation
- **Combo popups** with scale-in animation for x3+ chains
- **Grid floor** with dark ambient lighting for depth
- **Shadow mapping** (PCFSoftShadowMap) on all game objects

---

## 🏛️ Technical Architecture

```
index.html          → Entry point, import maps, Tailwind CSS layout
├── game.js         → Main game loop, state machine, collision handling
├── physics.js      → Rapier3D WASM wrapper, rigid bodies, debris spawning
├── renderer.js     → Three.js scene, camera, lighting, mesh creation
├── gestures.js     → MediaPipe Hands, webcam feed, gesture classification
├── levels.js       → Level layout matrices (10×N grids)
├── powerups.js     → Power-up system (planned)
└── ui.js           → DOM manipulation, HUD, combo popups, skeleton drawing
```

### Dependencies (loaded via CDN)

| Library | Version | CDN | Purpose |
|---------|---------|-----|---------|
| Three.js | r160 | esm.sh | 3D rendering, WebGL |
| Rapier3D | 0.12 | esm.sh (compat) | Physics engine (WASM) |
| MediaPipe Hands | latest | jsdelivr | Hand landmark detection |
| MediaPipe Camera | latest | jsdelivr | Webcam feed management |
| MediaPipe Drawing | latest | jsdelivr | Skeleton overlay |
| Tailwind CSS | 3.x | Play CDN | UI styling |

### Physics Engine Notes
- Uses **Rapier3D-compat** (bundles WASM binary, no CORS issues)
- Ball has **CCD enabled** (Continuous Collision Detection) to prevent tunneling at high speeds
- Ball gravity is **disabled** (gravity scale = 0) for arcade-style 2D-plane movement
- Bricks are **fixed** bodies (immovable)
- Paddle is **kinematic position-based** (moved by gesture input)
- Debris are **dynamic** bodies with applied impulse and torque

---

## 🛠️ Restart / Reset Behavior

- **Play Again button** appears on Game Over screen
- Clicking it:
  - Hides the Game Over overlay
  - Resets score to 0, lives to 3, level to 1, combo to x1
  - Destroys and recreates the paddle
  - Clears all bricks and reloads Level 1
  - Spawns a fresh ball with randomized starting angle
- **Level transition**: When all bricks are cleared, the next level loads automatically with a level clear bonus

---

## 📁 Project Structure

```
gesture-brick-breaker/
├── index.html          # Main HTML entry point
├── game.js             # Game orchestrator & collision logic
├── physics.js          # Rapier3D physics wrapper
├── renderer.js         # Three.js 3D renderer
├── gestures.js         # MediaPipe hand tracking
├── levels.js           # Level layout definitions
├── powerups.js         # Power-up system (WIP)
├── ui.js               # UI & HUD management
├── .gitignore          # Excludes node_modules
├── package.json        # npm metadata
└── README.md           # This file
```

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit changes (`git commit -m 'Add new feature'`)
4. Push to branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

## 📄 License

MIT License — feel free to use, modify, and distribute.

---

**Built with ❤️ using Three.js, Rapier3D, and MediaPipe Hands**
