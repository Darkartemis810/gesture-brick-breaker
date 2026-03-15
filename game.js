/**
 * game.js
 * The main orchestrator connecting UI, Render, Physics, and Gestures.
 */

import { UI } from './ui.js';
import { Gestures } from './gestures.js';
import { Physics } from './physics.js';
import { Renderer } from './renderer.js';
import { Levels } from './levels.js';

class Game {
    constructor() {
        this.state = {
            isPlaying: false,
            level: 1,
            score: 0,
            combo: 1,
            lives: 3,
            comboTimer: null,
            
            // Physics Elements
            paddleBody: null,
            ballBody: null,
            ballCollider: null,
            bricks: [],
            
            // Core Config
            ballBaseSpeed: 14,    // Slightly slower for better control
            paddleWidth: 7,       // Wider paddle for easier play
            fieldExtents: { x: 19, z: 14 } // Valid playable space bounds
        };
        
        this.gameLoop = this.gameLoop.bind(this);
    }

    async init() {
        // Init Subsystems
        UI.init();
        Renderer.init();
        
        // Wait for MediaPipe & Rapier to boot
        await Promise.all([
            Physics.init(),
            Gestures.init()
        ]);
        
        // Setup base walls
        this.setupBoundaryWalls();
        
        // Setup initial UI states
        UI.setScore(0);
        UI.setLevel(this.state.level);
        UI.setLives(this.state.lives);
        
        // Bind Start
        UI.elements.startBtn.addEventListener('click', () => this.startGame());
        UI.elements.startBtn.disabled = false;
        
        // Start empty render loop (no physics yet)
        requestAnimationFrame(this.gameLoop);
        console.log("Game initialized.");
    }

    setupBoundaryWalls() {
        const fw = Renderer.config.fieldWidth;
        const fd = Renderer.config.fieldDepth;
        const thick = 2;
        const h = 5;
        
        // Top Wall
        Physics.addWall(0, h/2, -fd + thick/2, fw*2, h, thick);
        // Left Wall
        Physics.addWall(-fw + thick/2, h/2, 0, thick, h, fd*2);
        // Right Wall
        Physics.addWall(fw - thick/2, h/2, 0, thick, h, fd*2);
        
        // Lose Sensor (Bottom)
        this.loseSensor = Physics.addLoseSensor(0, fw*2, 2);
    }

    resetBall() {
        if (this.state.ballBody) {
             // We can't easily reset a Rapier body's position instantly 
             // without creating rigid body anomalies in some versions.
             // The safest way is to destroy and recreate it.
             Physics.removeObject(this.ballMesh, this.state.ballBody);
             Renderer.scene.remove(this.ballMesh);
        }
        
        this.ballMesh = Renderer.createBall(0.6);
        this.ballMesh.position.set(0, 0.6, 5); // Start above paddle
        
        // Give it a starting velocity heading UP and slightly RIGHT
        const velocity = { x: 5, y: 0, z: -10 }; 
        const { body, collider } = Physics.addBall(this.ballMesh, 0.6, velocity);
        
        this.state.ballBody = body;
        this.state.ballCollider = collider;
    }

    spawnPaddle() {
        // Destroy old paddle if it exists (important for restart)
        if (this.state.paddleBody) {
            Physics.removeObject(this.paddleMesh, this.state.paddleBody);
            Renderer.scene.remove(this.paddleMesh);
            this.state.paddleBody = null;
        }
        
        const mesh = Renderer.createPaddle(this.state.paddleWidth, 1.0, 1.5);
        mesh.position.set(0, 0.5, 12);
        this.paddleMesh = mesh;
        
        // Physics Kinematic body
        this.state.paddleBody = Physics.addPaddle(mesh, this.state.paddleWidth, 1.0, 1.5);
    }

    loadLevel(levelIndex) {
        // Clean old bricks
        this.state.bricks.forEach(b => {
            Physics.removeObject(b.mesh, b.body);
            Renderer.scene.remove(b.mesh);
        });
        this.state.bricks = [];
        
        const layout = Levels[(levelIndex - 1) % Levels.length];
        
        // Build grid
        const cols = layout[0].length;
        const rows = layout.length;
        
        const brickW = 3.2;
        const brickH = 1.0;
        const brickD = 1.2;
        const paddingX = 0.3;
        const paddingZ = 0.3;
        
        const startX = -((cols * (brickW + paddingX)) / 2) + (brickW / 2);
        const startZ = -12; // Further back for more room
        
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const bType = layout[r][c];
                if (bType > 0) {
                    const x = startX + c * (brickW + paddingX);
                    const z = startZ + r * (brickD + paddingZ);
                    
                    // Pass bType for color (not row index)
                    const { mesh, color } = Renderer.createBrick(x, 0.5, z, brickW, brickH, brickD, bType);
                    const { body, collider } = Physics.addBrick(mesh, brickW, brickH, brickD, {
                        type: bType,
                        color: color
                    });
                    
                    this.state.bricks.push({ mesh, body, collider, active: true });
                }
            }
        }
    }

    startGame() {
        // Hide overlay and start button
        UI.hideOverlay();
        UI.elements.startBtn.classList.add('hidden');
        
        // Reset state
        this.state.isPlaying = true;
        this.state.score = 0;
        this.state.lives = 3;
        this.state.level = 1;
        this.state.combo = 1;
        
        // Update all UI displays
        UI.setScore(0);
        UI.setLives(3);
        UI.setLevel(1);
        UI.setCombo(1);
        
        // Clean up old ball if exists
        if (this.state.ballBody) {
            Physics.removeObject(this.ballMesh, this.state.ballBody);
            Renderer.scene.remove(this.ballMesh);
            this.state.ballBody = null;
        }
        
        this.spawnPaddle();
        this.loadLevel(this.state.level);
        this.resetBall();
    }
    
    addScore(points) {
        this.state.score += (points * this.state.combo);
        UI.setScore(this.state.score);
        
        this.state.combo++;
        UI.setCombo(this.state.combo);
        
        clearTimeout(this.state.comboTimer);
        this.state.comboTimer = setTimeout(() => {
            this.state.combo = 1;
            UI.setCombo(1);
        }, 2000);
    }

    handleCollisions() {
        // To handle collisions safely, we should drain the collision event queue
        // Rapier exposes an active event queue. For simplicity in this demo,
        // we'll do proximity checks or rely on the drainQueue method if used.
        // A robust way mapping to Rapier 0.12+ in JS:
        
        let ballP = this.state.ballBody.translation();
        let ballV = this.state.ballBody.linvel();
        
        // 1. Lose condition check
        if (ballP.z > 14.5) {
             // Ball passed the paddle
             this.state.lives--;
             UI.setLives(this.state.lives);
             
             if (this.state.lives <= 0) {
                 this.state.isPlaying = false;
                 UI.showOverlay("GAME OVER", `Final Score: ${this.state.score}`);
                 UI.elements.startBtn.classList.remove('hidden');
                 UI.elements.startBtn.textContent = "Play Again";
                 Physics.removeObject(this.ballMesh, this.state.ballBody);
                 Renderer.scene.remove(this.ballMesh);
             } else {
                 this.resetBall();
             }
             return;
        }
        
        // 2. Paddle bounce logic (Custom angle reflection)
        // If ball hits paddle, we adjust X velocity based on where it hit.
        const padP = this.state.paddleBody.translation();
        
        // Simple bounding box intersection for paddle
        if (ballP.z > padP.z - 1.5 && ballP.z < padP.z + 1.5 &&
            ballP.x > padP.x - (this.state.paddleWidth/2 + 0.6) && 
            ballP.x < padP.x + (this.state.paddleWidth/2 + 0.6)) {
            
            // Hit!
            // Ensure ball is moving towards the player so we don't trap it inside the paddle
            if (ballV.z > 0) {
                const hitDeltaX = ballP.x - padP.x;
                const normalizeHit = hitDeltaX / (this.state.paddleWidth / 2); // -1 to 1
                
                // Set new velocity
                const speed = this.state.ballBaseSpeed * (1 + (this.state.level * 0.1));
                const bounceAngle = normalizeHit * (Math.PI / 3); // Max 60 deg bounce
                
                this.state.ballBody.setLinvel({
                    x: Math.sin(bounceAngle) * speed,
                    y: 0,
                    z: -Math.cos(bounceAngle) * speed // Reflect back into screen
                }, true);
            }
        }
        
        // 3. Brick collisions
        let brickHit = false;
        
        // Since we didn't setup the complex event queue handler, we do a quick AABB check
        // for each active brick against the ball. This is fast enough for <100 bricks.
        for (let i = 0; i < this.state.bricks.length; i++) {
            const b = this.state.bricks[i];
            if (!b.active) continue;
            
            const bp = b.body.translation();
            // Brick is roughly 3.2x1x1.2. Check distance.
            const dx = Math.abs(ballP.x - bp.x);
            const dz = Math.abs(ballP.z - bp.z);
            
            // Sphere-AABB simplified check
            if (dx < (3.2/2 + 0.6) && dz < (1.2/2 + 0.6)) {
                // Hit!
                b.active = false;
                brickHit = true;
                
                this.addScore(100);
                
                // Spawn Debris
                const debris = Physics.spanDebris(bp, b.body.userData.color, 10);
                debris.forEach(d => Renderer.spawnFragmentMesh(d, b.body.userData.color));
                
                // Remove brick
                Physics.removeObject(b.mesh, b.body);
                Renderer.scene.remove(b.mesh);
                
                // Reflect ball (simplified reflection)
                // Determine which axis was hit hardest to flip velocity
                if (dx > dz) {
                    this.state.ballBody.setLinvel({x: -ballV.x, y: 0, z: ballV.z}, true);
                } else {
                    this.state.ballBody.setLinvel({x: ballV.x, y: 0, z: -ballV.z}, true);
                }
                
                break; // Only process one hit per frame to prevent chaos
            }
        }
        
        if (brickHit) {
            // Check Level Win
            if (!this.state.bricks.some(b => b.active)) {
                this.state.level++;
                UI.setLevel(this.state.level);
                this.loadLevel(this.state.level);
                this.resetBall();
            }
        }
        
        // 4. Smash Logic (Cone Raycast)
        if (Gestures.state.type === 'punch') {
            const now = Date.now();
            if (now > Gestures.state.smashCooldown) {
                Gestures.state.smashCooldown = now + 8000;
                UI.triggerSmashFlash();
                console.log("SMASH TRIGGERED!");
                
                // Find all bricks within a radius of the paddle and blast them
                // For simplicity, we just destroy the lowest 3 active bricks
                let smashed = 0;
                for (let i = this.state.bricks.length - 1; i >= 0; i--) {
                    const b = this.state.bricks[i];
                    if (b.active) {
                        b.active = false;
                        this.addScore(200);
                        
                        const bp = b.body.translation();
                        const debris = Physics.spanDebris(bp, b.body.userData.color, 12);
                        debris.forEach(d => Renderer.spawnFragmentMesh(d, b.body.userData.color));
                        Physics.removeObject(b.mesh, b.body);
                        Renderer.scene.remove(b.mesh);
                        
                        smashed++;
                        if (smashed >= 3) break;
                    }
                }
            }
        }

        // 5. Enforce constant speed (normalize velocity)
        const v = this.state.ballBody.linvel();
        const currentSpeed = Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z);
        const targetSpeed = this.state.ballBaseSpeed * (1 + (this.state.level * 0.1));
        
        if (currentSpeed > 0 && Math.abs(currentSpeed - targetSpeed) > 0.5) {
            const scale = targetSpeed / currentSpeed;
            // Freeze Y to 0 so ball doesn't fly up/down out of bounds
            this.state.ballBody.setLinvel({
                x: v.x * scale,
                y: 0, // Force 2D plane Movement
                z: v.z * scale
            }, true);
            // Also force ball Y position back to 0.6 if it drifted
            const p = this.state.ballBody.translation();
            this.state.ballBody.setTranslation({x: p.x, y: 0.6, z: p.z}, true);
        }
    }

    gameLoop() {
        requestAnimationFrame(this.gameLoop);
        
        if (this.state.isPlaying && !this.isPaused) {
            
            // 1. Apply Gesture paddle control (paddle ALWAYS follows active hand)
            if (this.state.paddleBody && Gestures.state.active) {
                // Map 0-1 to X bounds
                const targetX = (Gestures.state.paddleX * (this.state.fieldExtents.x * 2)) - this.state.fieldExtents.x;
                const lp = this.state.paddleBody.translation();
                this.state.paddleBody.setNextKinematicTranslation({
                    x: targetX,
                    y: lp.y,
                    z: lp.z
                });
            }
            
            // 2. Step Physics
            Physics.step();
            
            // 3. Handle Game Logic
            this.handleCollisions();
        }
        
        // 4. Render 3D Scene
        Renderer.render();
    }
}

// Boot
const game = new Game();
game.init();
