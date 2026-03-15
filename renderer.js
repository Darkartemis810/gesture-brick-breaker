/**
 * renderer.js
 * Advanced Three.js renderer with Bloom post-processing, 3D UI popups,
 * and high-fidelity visual effects.
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export const Renderer = {
    scene: null,
    camera: null,
    renderer: null,
    labelRenderer: null,
    composer: null,
    
    effects: {
        fragments: [],   // Debris elements 
        floatingScores: [],
        shake: { intensity: 0, duration: 0, originalPos: new THREE.Vector3() },
        starfield: null
    },
    
    init() {
        const container = document.getElementById('game-viewport');
        const width = container.clientWidth;
        const height = container.clientHeight;

        // 1. Core Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ReinhardToneMapping;
        container.appendChild(this.renderer.domElement);

        // 2. CSS2D Label Renderer (for score popups)
        this.labelRenderer = new CSS2DRenderer();
        this.labelRenderer.setSize(width, height);
        this.labelRenderer.domElement.style.position = 'absolute';
        this.labelRenderer.domElement.style.top = '0px';
        this.labelRenderer.domElement.style.pointerEvents = 'none';
        container.appendChild(this.labelRenderer.domElement);

        // 3. Scene & Starfield
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x020205);
        this.createStarfield();

        // 4. Camera
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        this.camera.position.set(0, 22, 28);
        this.camera.lookAt(0, 0, -5);
        this.effects.shake.originalPos.copy(this.camera.position);

        // 5. Post-Processing (Bloom)
        const renderScene = new RenderPass(this.scene, this.camera);
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 1.2, 0.4, 0.85);
        bloomPass.threshold = 0.4;
        bloomPass.strength = 1.2;
        bloomPass.radius = 0.5;

        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(renderScene);
        this.composer.addPass(bloomPass);

        // 6. Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0x00f3ff, 1.5, 100);
        pointLight.position.set(0, 20, 10);
        this.scene.add(pointLight);

        // 7. Grid Floor
        const grid = new THREE.GridHelper(80, 40, 0x111122, 0x080811);
        grid.position.y = -0.05;
        this.scene.add(grid);

        // Resize Handler
        window.addEventListener('resize', () => {
             const newW = container.clientWidth;
             const newH = container.clientHeight;
             this.renderer.setSize(newW, newH);
             this.labelRenderer.setSize(newW, newH);
             this.composer.setSize(newW, newH);
             this.camera.aspect = newW / newH;
             this.camera.updateProjectionMatrix();
        });
        
        console.log("Renderer Overhaul Complete.");
    },

    createStarfield() {
        const vertices = [];
        for (let i = 0; i < 1500; i++) {
            const x = THREE.MathUtils.randFloatSpread(400);
            const y = THREE.MathUtils.randFloatSpread(400);
            const z = THREE.MathUtils.randFloatSpread(400);
            vertices.push(x, y, z);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        const material = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, transparent: true, opacity: 0.5 });
        const stars = new THREE.Points(geometry, material);
        this.scene.add(stars);
        this.effects.starfield = stars;
    },

    createPaddle(w, h, d) {
        const geo = new THREE.BoxGeometry(1, 1, 1); // Unit box for easy scaling
        const mat = new THREE.MeshStandardMaterial({
             color: 0x00f3ff,
             emissive: 0x00f3ff,
             emissiveIntensity: 1.0,
             roughness: 0.1,
             metalness: 0.8
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.scale.set(w, h, d);
        mesh.castShadow = true;
        this.scene.add(mesh);
        
        const light = new THREE.PointLight(0x00f3ff, 1, 10);
        mesh.add(light);
        
        return mesh;
    },

    createBall(radius) {
        const geo = new THREE.SphereGeometry(radius, 24, 24);
        const mat = new THREE.MeshStandardMaterial({
             color: 0xffffff,
             emissive: 0xffffff, 
             emissiveIntensity: 0.8
        });
        const mesh = new THREE.Mesh(geo, mat);
        this.scene.add(mesh);
        
        const light = new THREE.PointLight(0xffffff, 0.5, 12);
        mesh.add(light);
        
        return mesh;
    },

    createBrick(x, y, z, w, h, d, type) {
        const colors = [0x00f3ff, 0x39ff14, 0xb300ff, 0xff00ff, 0xff5500];
        const baseColor = colors[(type - 1) % colors.length];
        
        const geo = new THREE.BoxGeometry(w, h, d);
        const mat = new THREE.MeshStandardMaterial({
             color: baseColor,
             emissive: baseColor,
             emissiveIntensity: 0.4
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        this.scene.add(mesh);
        return { mesh, color: baseColor };
    },

    spawnFloatingScore(x, y, z, val) {
        const div = document.createElement('div');
        div.className = 'floating-score text-brand-neonCyan font-black text-xl pointer-events-none';
        div.textContent = `+${val}`;
        div.style.textShadow = '0 0 10px #00f3ff';
        
        const label = new CSS2DObject(div);
        label.position.set(x, y + 1, z);
        this.scene.add(label);
        
        this.effects.floatingScores.push({
            obj: label,
            spawnTime: Date.now()
        });
    },

    shakeCamera(intensity = 0.15) {
        this.effects.shake.intensity = intensity;
        this.effects.shake.duration = 15; // frames approx
    },

    render() {
        if (!this.renderer || !this.scene || !this.camera) return;

        // Effects Update
        this.updateEffects();

        // Composer (Bloom) + CSS2D Labels
        this.composer.render();
        this.labelRenderer.render(this.scene, this.camera);
    },

    updateEffects() {
        const now = Date.now();
        
        // 1. Camera Shake
        if (this.effects.shake.duration > 0) {
            this.effects.shake.duration--;
            const i = this.effects.shake.intensity;
            this.camera.position.set(
                this.effects.shake.originalPos.x + (Math.random() - 0.5) * i,
                this.effects.shake.originalPos.y + (Math.random() - 0.5) * i,
                this.effects.shake.originalPos.z + (Math.random() - 0.5) * i
            );
            if (this.effects.shake.duration === 0) {
                this.camera.position.copy(this.effects.shake.originalPos);
            }
        }

        // 2. Score popups (rise and fade)
        for (let i = this.effects.floatingScores.length - 1; i >= 0; i--) {
            const item = this.effects.floatingScores[i];
            const age = now - item.spawnTime;
            if (age > 1200) {
                this.scene.remove(item.obj);
                this.effects.floatingScores.splice(i, 1);
            } else {
                item.obj.position.y += 0.03;
                item.obj.element.style.opacity = 1 - (age / 1200);
            }
        }

        // 3. Debris Fragments
        for (let i = this.effects.fragments.length - 1; i >= 0; i--) {
            const frag = this.effects.fragments[i];
            const age = now - frag.spawnTime;
            if (age > 2000) {
                this.scene.remove(frag.mesh);
                this.effects.fragments.splice(i, 1);
            } else {
                frag.mesh.material.opacity = 0.8 * (1 - age / 2000);
            }
        }
    }
};
