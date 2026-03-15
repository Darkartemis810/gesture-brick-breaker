/**
 * renderer.js
 * Manages the Three.js scene, camera, visual effects, and render loop execution.
 */

import * as THREE from 'three';

export const Renderer = {
    scene: null,
    camera: null,
    renderer: null,
    
    effects: {
        fragments: [],   // Debris elements to draw & decay
        particles: [],   // Visual point systems 
        ballTrail: null, // TubeGeometry trailing the ball
    },
    
    // Config values
    config: {
        fieldWidth: 40,
        fieldDepth: 30,
    },

    init() {
        const container = document.getElementById('game-viewport');
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0f); // Dark brand background

        // Camera - slightly above, looking down towards the playfield
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        this.camera.position.set(0, 18, 25);
        this.camera.lookAt(0, 0, -5);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(20, 30, 10);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.left = -30;
        dirLight.shadow.camera.right = 30;
        dirLight.shadow.camera.top = 20;
        dirLight.shadow.camera.bottom = -20;
        this.scene.add(dirLight);

        // Floor
        const floorGeo = new THREE.PlaneGeometry(this.config.fieldWidth * 2, this.config.fieldDepth * 2);
        const floorMat = new THREE.MeshStandardMaterial({ 
             color: 0x111116, 
             roughness: 0.8, 
             metalness: 0.2 
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -1; // slightly below physics floor
        floor.receiveShadow = true;
        this.scene.add(floor);
        
        // Grid helper on floor
        const grid = new THREE.GridHelper(60, 30, 0x333344, 0x222233);
        grid.position.y = -0.99;
        this.scene.add(grid);

        // Resize handler
        window.addEventListener('resize', () => {
             const newW = container.clientWidth;
             const newH = container.clientHeight;
             this.renderer.setSize(newW, newH);
             this.camera.aspect = newW / newH;
             this.camera.updateProjectionMatrix();
        });
        
        console.log("Three.js renderer initialized");
    },
    
    render() {
        if (!this.renderer || !this.scene || !this.camera) return;
        this.updateEffects();
        this.renderer.render(this.scene, this.camera);
    },
    
    updateEffects() {
        const now = Date.now();
        // Decay fragments
        for (let i = this.effects.fragments.length - 1; i >= 0; i--) {
            const frag = this.effects.fragments[i];
            const age = now - frag.spawnTime;
            if (age > 2500) {
                // remove
                this.scene.remove(frag.mesh);
                frag.mesh.geometry.dispose();
                frag.mesh.material.dispose();
                this.effects.fragments.splice(i, 1);
            } else {
                // fade out
                frag.mesh.material.opacity = 1 - (age / 2500);
            }
        }
    },

    createPaddle(w, h, d) {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mat = new THREE.MeshStandardMaterial({
             color: 0x00f3ff,
             emissive: 0x00f3ff,
             emissiveIntensity: 0.8, // Glowing paddle
             roughness: 0.1,
             metalness: 0.8
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        this.scene.add(mesh);
        
        // Attach a moving point light to the paddle
        const pLight = new THREE.PointLight(0x00f3ff, 1, 10);
        pLight.position.set(0, 0, 0); // local center
        mesh.add(pLight);
        
        return mesh;
    },

    createBall(radius) {
        const geo = new THREE.SphereGeometry(radius, 16, 16);
        const mat = new THREE.MeshStandardMaterial({
             color: 0xffffff,
             emissive: 0xffffff, 
             emissiveIntensity: 0.5,
             roughness: 0.1, 
             metalness: 0.5
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        this.scene.add(mesh);
        
        // Attach point light to ball
        const bLight = new THREE.PointLight(0xaaaaaa, 0.8, 15);
        mesh.add(bLight);
        
        return mesh;
    },

    createBrick(x, y, z, w, h, d, colorRow) {
        const colors = [0x00f3ff, 0x39ff14, 0xb300ff, 0xff00ff, 0xff5500];
        const baseColor = colors[colorRow % colors.length];
        
        const geo = new THREE.BoxGeometry(w, h, d);
        const mat = new THREE.MeshStandardMaterial({
             color: baseColor,
             emissive: baseColor,
             emissiveIntensity: 0.3,
             roughness: 0.3,
             metalness: 0.5
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        return { mesh, color: baseColor };
    },
    
    spawnFragmentMesh(physicsDebrisItem, color) {
        const geo = new THREE.BoxGeometry(physicsDebrisItem.size, physicsDebrisItem.size, physicsDebrisItem.size);
        const mat = new THREE.MeshStandardMaterial({
             color: color, 
             emissive: color,
             emissiveIntensity: 0.4,
             transparent: true,
             opacity: 1.0
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        this.scene.add(mesh);
        
        // Track the mesh alongside the physics body
        physicsDebrisItem.mesh = mesh;
        this.effects.fragments.push(physicsDebrisItem);
    },
    
    shakeCamera(intensity) {
        // Implement CSS or ThreeJS shake logic
    }
};
