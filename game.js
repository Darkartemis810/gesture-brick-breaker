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
            ballBaseSpeed: 15,
            paddleWidth: 7,
            fieldExtents: { x: 18, z: 14 } // Tighter bounds to keep ball visible
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
        
        // Top Wall (back of field)
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
             Physics.removeObject(this.ballMesh, this.state.ballBody);
             Renderer.scene.remove(this.ballMesh);
        }
        
        this.ballMesh = Renderer.createBall(0.6);
        this.ballMesh.position.set(0, 0.6, 8); // Start closer to paddle
        
        // Give it a starting velocity heading UP and slightly to one side
        const angle = (Math.random() - 0.5) * 0.8; // Random slight angle
        const speed = this.state.ballBaseSpeed;
        const velocity = { 
            x: Math.sin(angle) * speed, 
            y: 0, 
            z: -Math.cos(angle) * speed  
        };
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
        // Combo multiplier bonus: x1=100, x2=200, x3=300, x5=500, x10=1000!
        const comboPoints = points * this.state.combo;
        this.state.score += comboPoints;
        UI.setScore(this.state.score);
        
        // Show floating combo text for big combos
        if (this.state.combo >= 3) {
            UI.showComboPopup(`x${this.state.combo} COMBO! +${comboPoints}`);
        }
        
        // Increase combo
        this.state.combo++;
        UI.setCombo(this.state.combo);
        
        // Combo window: 3 seconds to maintain combo
        clearTimeout(this.state.comboTimer);
        this.state.comboTimer = setTimeout(() => {
            this.state.combo = 1;
            UI.setCombo(1);
        }, 3000); // 3 seconds instead of 2 for more forgiving combos
    }

    handleCollisions() {
        if (!this.state.ballBody) return;
        
        let ballP = this.state.ballBody.translation();
        let ballV = this.state.ballBody.linvel();
        
        // 0. STRICT BOUNDARY ENFORCEMENT - Ball must NEVER leave the visible area
        const maxX = this.state.fieldExtents.x - 1;
        const minZ = -28; // Far back wall
        const maxZ = 15;  // Just past paddle
        let clamped = false;
        
        if (ballP.x > maxX) {
            ballP.x = maxX;
            ballV.x = -Math.abs(ballV.x);
            clamped = true;
        } else if (ballP.x < -maxX) {
            ballP.x = -maxX;
            ballV.x = Math.abs(ballV.x);
            clamped = true;
        }
        
        if (ballP.z < minZ) {
            ballP.z = minZ;
            ballV.z = Math.abs(ballV.z);
            clamped = true;
        }
        
        if (clamped) {
            this.state.ballBody.setTranslation({x: ballP.x, y: 0.6, z: ballP.z}, true);
            this.state.ballBody.setLinvel({x: ballV.x, y: 0, z: ballV.z}, true);
        }
        
        // 1. Lose condition check
        if (ballP.z > maxZ) {
             // Ball passed the paddle
             this.state.lives--;
             UI.setLives(this.state.lives);
             
             // Reset combo on life lost
             this.state.combo = 1;
             UI.setCombo(1);
             
             if (this.state.lives <= 0) {
                 this.state.isPlaying = false;
                 UI.showOverlay("GAME OVER", `Final Score: ${this.state.score}`);
                 UI.elements.startBtn.classList.remove('hidden');
                 UI.elements.startBtn.textContent = "Play Again";
                 Physics.removeObject(this.ballMesh, this.state.ballBody);
                 Renderer.scene.remove(this.ballMesh);
                 this.state.ballBody = null;
             } else {
                 UI.showComboPopup(`LIFE LOST! ${this.state.lives} remaining`);
                 this.resetBall();
             }
             return;
        }
        
        // 2. Paddle bounce logic (Custom angle reflection)
        const padP = this.state.paddleBody.translation();
        
        // Simple bounding box intersection for paddle
        if (ballP.z > padP.z - 1.5 && ballP.z < padP.z + 1.5 &&
            ballP.x > padP.x - (this.state.paddleWidth/2 + 0.6) && 
            ballP.x < padP.x + (this.state.paddleWidth/2 + 0.6)) {
            
            // Ensure ball is moving towards the player so we don't trap it
            if (ballV.z > 0) {
                const hitDeltaX = ballP.x - padP.x;
                const normalizeHit = hitDeltaX / (this.state.paddleWidth / 2); // -1 to 1
                
                // Set new velocity
                const speed = this.state.ballBaseSpeed * (1 + (this.state.level * 0.08));
                const bounceAngle = normalizeHit * (Math.PI / 3.5); // Max ~51 deg bounce (tighter angles)
                
                this.state.ballBody.setLinvel({
                    x: Math.sin(bounceAngle) * speed,
                    y: 0,
                    z: -Math.cos(bounceAngle) * speed
                }, true);
                
                // Push ball slightly above paddle to prevent re-triggering
                this.state.ballBody.setTranslation({
                    x: ballP.x, y: 0.6, z: padP.z - 1.6
                }, true);
            }
        }
        
        // 3. Brick collisions
        let brickHit = false;
        
        for (let i = 0; i < this.state.bricks.length; i++) {
            const b = this.state.bricks[i];
            if (!b.active) continue;
            
            const bp = b.body.translation();
            const dx = Math.abs(ballP.x - bp.x);
            const dz = Math.abs(ballP.z - bp.z);
            
            // Sphere-AABB simplified check
            if (dx < (3.2/2 + 0.6) && dz < (1.2/2 + 0.6)) {
                // Hit!
                b.active = false;
                brickHit = true;
                
                // Score based on brick type (higher type = more points)
                const brickPoints = b.body.userData.type * 50;
                this.addScore(brickPoints);
                
                // Spawn Debris (reduced count for performance - was 10, now 4)
                const debris = Physics.spanDebris(bp, b.body.userData.color, 4);
                debris.forEach(d => Renderer.spawnFragmentMesh(d, b.body.userData.color));
                
                // Remove brick
                Physics.removeObject(b.mesh, b.body);
                Renderer.scene.remove(b.mesh);
                
                // Reflect ball (simplified reflection)
                if (dx > dz) {
                    this.state.ballBody.setLinvel({x: -ballV.x, y: 0, z: ballV.z}, true);
                } else {
                    this.state.ballBody.setLinvel({x: ballV.x, y: 0, z: -ballV.z}, true);
                }
                
                break; // Only process one hit per frame
            }
        }
        
        if (brickHit) {
            // Check Level Win
            const remaining = this.state.bricks.filter(b => b.active).length;
            if (remaining === 0) {
                this.state.level++;
                UI.setLevel(this.state.level);
                
                // Level clear bonus!
                const levelBonus = this.state.level * 1000;
                this.state.score += levelBonus;
                UI.setScore(this.state.score);
                UI.showComboPopup(`LEVEL CLEAR! +${levelBonus} BONUS`);
                
                this.loadLevel(this.state.level);
                this.resetBall();
            }
        }
        
        // 4. Smash Logic (Punch gesture)
        if (Gestures.state.type === 'punch') {
            const now = Date.now();
            if (now > Gestures.state.smashCooldown) {
                Gestures.state.smashCooldown = now + 8000;
                UI.triggerSmashFlash();
                
                let smashed = 0;
                for (let i = this.state.bricks.length - 1; i >= 0; i--) {
                    const b = this.state.bricks[i];
                    if (b.active) {
                        b.active = false;
                        this.addScore(200);
                        
                        const bp = b.body.translation();
                        const debris = Physics.spanDebris(bp, b.body.userData.color, 3);
                        debris.forEach(d => Renderer.spawnFragmentMesh(d, b.body.userData.color));
                        Physics.removeObject(b.mesh, b.body);
                        Renderer.scene.remove(b.mesh);
                        
                        smashed++;
                        if (smashed >= 3) break;
                    }
                }
                
                if (smashed > 0) {
                    UI.showComboPopup(`SMASH! x${smashed} BRICKS!`);
                }
            }
        }

        // 5. Enforce constant speed (normalize velocity) — every frame
        const v = this.state.ballBody.linvel();
        const currentSpeed = Math.sqrt(v.x*v.x + v.z*v.z); // ignore Y
        const targetSpeed = this.state.ballBaseSpeed * (1 + (this.state.level * 0.08));
        
        if (currentSpeed > 0.1) {
            const scale = targetSpeed / currentSpeed;
            this.state.ballBody.setLinvel({
                x: v.x * scale,
                y: 0,
                z: v.z * scale
            }, true);
        }
        
        // Force ball Y position
        const p = this.state.ballBody.translation();
        if (Math.abs(p.y - 0.6) > 0.1) {
            this.state.ballBody.setTranslation({x: p.x, y: 0.6, z: p.z}, true);
        }
        
        // Prevent ball from getting stuck horizontally 
        const vv = this.state.ballBody.linvel();
        if (Math.abs(vv.z) < 1.0) {
            this.state.ballBody.setLinvel({
                x: vv.x,
                y: 0,
                z: vv.z > 0 ? 3 : -3  // Give it a nudge in Z
            }, true);
        }
    }

    gameLoop() {
        requestAnimationFrame(this.gameLoop);
        
        if (this.state.isPlaying && !this.isPaused) {
            
            // 1. Apply Gesture paddle control (paddle ALWAYS follows active hand)
            if (this.state.paddleBody && Gestures.state.active) {
                // Map 0-1 to X bounds
                const targetX = (Gestures.state.paddleX * (this.state.fieldExtents.x * 2)) - this.state.fieldExtents.x;
                // Clamp paddle within the field
                const clampedX = Math.max(-this.state.fieldExtents.x + this.state.paddleWidth/2, 
                                 Math.min(this.state.fieldExtents.x - this.state.paddleWidth/2, targetX));
                const lp = this.state.paddleBody.translation();
                this.state.paddleBody.setNextKinematicTranslation({
                    x: clampedX,
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
