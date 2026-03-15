/**
 * game.js
 * Master orchestrator for the Gesture Brick Breaker overdrive.
 * Handles physics integration, ability logic, power-ups, levels, and scoring.
 */

import * as THREE from 'three';
import { Renderer } from './renderer.js';
import { Physics } from './physics.js';
import { Gestures } from './gestures.js';
import { Levels } from './levels.js';
import { Powerups } from './powerups.js';
import { UI } from './ui.js';

export const Game = {
    state: {
        running: false,
        paused: false,
        level: 0,
        score: 0,
        lives: 3,
        combo: 1,
        lastHitTime: 0,
        balls: [], // { mesh, body }
        bricks: [], // { mesh, body, type, hits, maxHits, pos }
        paddle: null,
        frozen: false,
        freezeTime: 0,
        cooldowns: { laser: 0, smash: 0, freeze: 1 }, // freeze is once per level
        activePowerups: { magnet: 0, surge: 0 },
        stats: { gestures: { OPEN_HAND:0, FIST:0, PINCH:0, PUNCH:0, PEACE:0 } }
    },

    config: {
        ballBaseSpeed: 16,
        fieldWidth: 32,
        fieldDepth: 40,
        paddleY: 0.6,
        paddleZ: 16,
    },

    async init() {
        await Physics.init();
        Renderer.init();
        UI.init();
        Gestures.init();

        this.setupListeners();
        this.gameLoop();
    },

    setupListeners() {
        document.getElementById('start-btn').onclick = () => this.startGame();
        document.getElementById('restart-btn').onclick = () => this.startGame();
    },

    startGame() {
        // Reset State
        this.state.score = 0;
        this.state.level = 0;
        this.state.lives = 3;
        this.state.combo = 1;
        this.state.running = true;
        this.state.paused = false;
        
        UI.hideOverlay();
        this.loadLevel(0);
        this.spawnPaddle();
        this.resetBall();
    },

    loadLevel(idx) {
        this.state.level = idx;
        // Cleanup old bricks
        this.state.bricks.forEach(b => {
            Renderer.scene.remove(b.mesh);
            Physics.world.removeRigidBody(b.body);
        });
        this.state.bricks = [];
        this.state.cooldowns.freeze = 1; // Reset freeze use

        const layout = Levels.getLevel(idx);
        const startZ = -15;
        const brickW = 3.0, brickH = 1.0, brickD = 1.2;
        const padding = 0.2;

        layout.forEach((row, r) => {
            row.forEach((type, c) => {
                if (type === 0) return;
                const x = (c - 4.5) * (brickW + padding);
                const z = startZ + r * (brickD + padding);
                
                // Physics body
                const body = Physics.createBox(x, 0.6, z, brickW, brickH, brickD, false);
                // Visual
                const { mesh, color } = Renderer.createBrick(x, 0.6, z, brickW, brickH, brickD, type);
                
                this.state.bricks.push({
                    mesh, body, type, color,
                    hits: 0, maxHits: (type === 2 ? 2 : 1),
                    pos: new THREE.Vector3(x, 0.6, z),
                    regenTime: 0
                });
            });
        });
    },

    spawnPaddle() {
        if (this.state.paddle) {
            Renderer.scene.remove(this.state.paddle.mesh);
            Physics.world.removeRigidBody(this.state.paddle.body);
        }
        const body = Physics.createBox(0, this.config.paddleY, this.config.paddleZ, 10, 0.8, 1.2, true);
        const mesh = Renderer.createPaddle(10, 0.8, 1.2);
        this.state.paddle = { mesh, body, width: 10 };
    },

    resetBall() {
        // Cleanup existing balls
        this.state.balls.forEach(b => {
            Renderer.scene.remove(b.mesh);
            Physics.world.removeRigidBody(b.body);
        });
        this.state.balls = [];

        this.spawnBall(0, this.config.paddleY, 14);
    },

    spawnBall(x, y, z, vx = null, vz = null) {
        const radius = 0.5;
        const body = Physics.createSphere(x, y, z, radius, true);
        const mesh = Renderer.createBall(radius);
        
        const angle = (Math.random() - 0.5) * 0.8;
        const speed = this.config.ballBaseSpeed + (this.state.level * 0.5);
        const velocity = { 
            x: vx !== null ? vx : Math.sin(angle) * speed, 
            y: 0, 
            z: vz !== null ? vz : -Math.cos(angle) * speed 
        };
        body.setLinvel(velocity, true);
        
        this.state.balls.push({ mesh, body });
    },

    /**
     * Main Logic Loop
     */
    update(dt) {
        if (!this.state.running || this.state.paused) return;

        // 1. Time Freeze check
        if (this.state.frozen) {
            this.state.freezeTime -= dt;
            if (this.state.freezeTime <= 0) this.state.frozen = false;
            // Don't step physics while frozen
        } else {
            Physics.step();
        }

        // 2. Sync Visuals
        this.state.balls.forEach(b => {
            const p = b.body.translation();
            b.mesh.position.set(p.x, p.y, p.z);
            this.clampBall(b);
        });

        // 3. Handle Input (Paddle)
        this.handlePaddleInput(dt);

        // 4. Handle Cooldowns & Powerups
        this.updateTimers(dt);

        // 5. Collisions & Gameplay
        this.handleCollisions();
        
        // 6. Level Win?
        if (this.state.bricks.filter(b => b.type !== 5).length === 0) {
            this.addScore(1000 * (this.state.level + 1));
            this.loadLevel(this.state.level + 1);
            this.resetBall();
        }
        
        // 7. Check Game Over
        if (this.state.balls.length === 0) {
            this.state.lives--;
            UI.updateHUD(this.state);
            if (this.state.lives <= 0) {
                this.gameOver();
            } else {
                this.resetBall();
            }
        }

        Powerups.update(dt);
    },

    handlePaddleInput(dt) {
        if (!this.state.paddle) return;
        const { paddleX, type } = Gestures.state;
        
        // Dynamic Width
        let targetWidth = 10;
        if (type === 'fist') targetWidth = 4;
        
        if (this.state.paddle.width !== targetWidth) {
            this.state.paddle.width = THREE.MathUtils.lerp(this.state.paddle.width, targetWidth, 0.1);
            this.state.paddle.mesh.scale.x = this.state.paddle.width;
            // Update physics shape (approximate with setTranslation since we can't easily swap shapes mid-flight)
            // In a pro engine we'd recreate the collider, but for WebGL arcade, 
            // we'll just keep the physical width for now or recreate it if it delta is large.
        }

        // Movement
        const targetX = (paddleX - 0.5) * this.config.fieldWidth;
        this.state.paddle.body.setNextKinematicTranslation({ x: targetX, y: this.config.paddleY, z: this.config.paddleZ });
        this.state.paddle.mesh.position.set(targetX, this.config.paddleY, this.config.paddleZ);

        // Abilities
        if (type === 'pinch' && this.state.cooldowns.laser <= 0) this.fireLaser();
        if (type === 'punch' && this.state.cooldowns.smash <= 0) this.performSmash();
        if (type === 'peace' && this.state.cooldowns.freeze > 0) this.activateFreeze();
        
        if (type !== 'none') this.state.stats.gestures[type.toUpperCase()]++;
    },

    fireLaser() {
        this.state.cooldowns.laser = 5;
        // Simple raycast logic
        const paddleX = this.state.paddle.mesh.position.x;
        let hitBrick = null;
        let minDist = 999;

        this.state.bricks.forEach(b => {
            if (Math.abs(b.pos.x - paddleX) < 1.5 && b.pos.z < this.config.paddleZ) {
                const d = this.config.paddleZ - b.pos.z;
                if (d < minDist) {
                    minDist = d;
                    hitBrick = b;
                }
            }
        });

        if (hitBrick) {
            this.destroyBrick(hitBrick, true);
        }
    },

    performSmash() {
        this.state.cooldowns.smash = 8;
        Renderer.shakeCamera(0.3);
        const p = this.state.paddle.mesh.position;
        
        this.state.bricks.forEach(b => {
            const d = p.distanceTo(b.pos);
            if (d < 12) { // 12 unit radius for "Smash"
                this.destroyBrick(b, true);
            }
        });
    },

    activateFreeze() {
        this.state.cooldowns.freeze = 0;
        this.state.frozen = true;
        this.state.freezeTime = 2.0;
        UI.showFlash('rgba(0, 100, 255, 0.3)', 2000);
    },

    destroyBrick(brick, isAbiltiy = false) {
        brick.hits++;
        if (brick.hits < brick.maxHits) {
            brick.mesh.material.emissiveIntensity = 0.1; // "Cracked" look
            brick.mesh.material.color.setHex(0x555500);
            return;
        }

        // Logic for types
        if (brick.type === 3) { // Explosive
            this.state.bricks.forEach(other => {
                if (other !== brick && other.pos.distanceTo(brick.pos) < 5) {
                    this.destroyBrick(other, true);
                }
            });
        }

        // Remove
        Renderer.scene.remove(brick.mesh);
        Physics.world.removeRigidBody(brick.body);
        this.state.bricks = this.state.bricks.filter(b => b !== brick);
        
        // Score
        const base = brick.type * 50;
        this.addScore(base, brick.pos);
        
        // Powerup?
        if (Math.random() < 0.15) Powerups.spawn(brick.pos);
        Renderer.shakeCamera(0.05);
    },

    addScore(points, pos = null) {
        let multi = this.state.combo;
        if (Gestures.state.type === 'fist') multi *= 2;
        if (this.state.activePowerups.surge > 0) multi *= 3;
        
        const total = points * multi;
        this.state.score += total;
        
        if (pos) Renderer.spawnFloatingScore(pos.x, pos.y, pos.z, total);
        
        this.state.combo++;
        this.state.lastHitTime = Date.now();
        UI.updateHUD(this.state);
    },

    handleCollisions() {
        const now = Date.now();
        // Combo timeout
        if (now - this.state.lastHitTime > 3000) this.state.combo = 1;

        this.state.balls.forEach(ball => {
            const v = ball.body.linvel();
            const p = ball.body.translation();

            // Ball vs Paddle (Approximate)
            const pad = this.state.paddle.mesh.position;
            if (p.z > pad.z - 1 && p.z < pad.z + 1 && Math.abs(p.x - pad.x) < this.state.paddle.width/2 + 0.5) {
                // Bounce
                const hitX = (p.x - pad.x) / (this.state.paddle.width / 2); // -1 to 1
                ball.body.setLinvel({ x: hitX * 15, y: 0, z: -Math.abs(v.z) * 1.05 }, true);
            }

            // Ball vs Bricks
            for (let i = this.state.bricks.length - 1; i >= 0; i--) {
                const b = this.state.bricks[i];
                if (Math.abs(p.x - b.pos.x) < 2 && Math.abs(p.z - b.pos.z) < 1.2) {
                    if (b.type !== 5) {
                        this.destroyBrick(b);
                    }
                    ball.body.setLinvel({ x: v.x, y: 0, z: -v.z }, true);
                    break;
                }
            }

            // Ball vs Powerups
            for (let i = Powerups.activeOrbs.length - 1; i >= 0; i--) {
                const orb = Powerups.activeOrbs[i];
                if (new THREE.Vector3(p.x, p.y, p.z).distanceTo(orb.mesh.position) < 1.5) {
                    this.applyPowerup(orb.type);
                    Powerups.remove(i);
                }
            }
        });
    },

    applyPowerup(type) {
        UI.showFlash('rgba(255, 215, 0, 0.2)', 500);
        if (type === 'MULTIBALL') {
            const b = this.state.balls[0];
            const v = b.body.linvel();
            const p = b.body.translation();
            this.spawnBall(p.x, p.y, p.z, v.x + 5, -v.z);
            this.spawnBall(p.x, p.y, p.z, v.x - 5, -v.z);
        } else if (type === 'NUKE') {
            this.state.bricks.forEach(b => {
                if (b.type <= 2) this.destroyBrick(b, true);
            });
        } else if (type === 'SCORE_SURGE') {
            this.state.activePowerups.surge = 8.0;
        } else if (type === 'MAGNET') {
            this.state.activePowerups.magnet = 6.0;
        }
    },

    clampBall(b) {
        let p = b.body.translation();
        let v = b.body.linvel();
        let changed = false;

        const limitX = 18;
        if (Math.abs(p.x) > limitX) {
            p.x = Math.sign(p.x) * limitX;
            v.x *= -1;
            changed = true;
        }
        if (p.z < -22) { // Top wall
            p.z = -22;
            v.z *= -1;
            changed = true;
        }
        if (p.z > 22) { // Out of bounds
            this.state.balls = this.state.balls.filter(ball => ball !== b);
            Renderer.scene.remove(b.mesh);
            Physics.world.removeRigidBody(b.body);
            return;
        }

        if (changed) {
            b.body.setTranslation(p, true);
            b.body.setLinvel(v, true);
        }
    },

    updateTimers(dt) {
        for (const k in this.state.cooldowns) {
            if (this.state.cooldowns[k] > 0 && k !== 'freeze') {
                this.state.cooldowns[k] -= dt;
            }
        }
        for (const k in this.state.activePowerups) {
            if (this.state.activePowerups[k] > 0) {
                this.state.activePowerups[k] -= dt;
            }
        }
        UI.updateHUD(this.state);
    },

    gameLoop() {
        const now = performance.now();
        const dt = (now - (this._lastTime || now)) / 1000;
        this._lastTime = now;

        this.update(dt);
        Renderer.render();
        requestAnimationFrame(() => this.gameLoop());
    },

    gameOver() {
        this.state.running = false;
        UI.showGameOver(this.state);
    }
};

Game.init();
