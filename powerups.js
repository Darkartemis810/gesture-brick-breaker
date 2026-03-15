/**
 * powerups.js
 * Manages falling power-up orbs, their visual effects, and lifecycle.
 */

import * as THREE from 'three';
import { Renderer } from './renderer.js';

export const Powerups = {
    types: {
        MULTIBALL: { color: 0xffff00, label: 'MULTIBALL' },
        MAGNET:    { color: 0x00aaff, label: 'MAGNET' },
        NUKE:      { color: 0xff0000, label: 'NUKE' },
        SCORE_SURGE: { color: 0xffd700, label: 'SCORE_SURGE' }
    },

    activeOrbs: [],

    /**
     * Spawn a falling orb at a destroyed brick's position.
     */
    spawn(position, typeKey = null) {
        if (!typeKey) {
            const keys = Object.keys(this.types);
            typeKey = keys[Math.floor(Math.random() * keys.length)];
        }
        const config = this.types[typeKey];

        // 1. Create main orb mesh
        const geo = new THREE.SphereGeometry(0.4, 12, 12);
        const mat = new THREE.MeshStandardMaterial({
            color: config.color,
            emissive: config.color,
            emissiveIntensity: 1.5,
            transparent: true,
            opacity: 0.9
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);
        Renderer.scene.add(mesh);

        // 2. Create trail particles
        const trail = [];
        for (let i = 0; i < 6; i++) {
            const pGeo = new THREE.SphereGeometry(0.15, 8, 8);
            const pMat = new THREE.MeshStandardMaterial({
                color: config.color,
                emissive: config.color,
                transparent: true,
                opacity: 0.5
            });
            const pMesh = new THREE.Mesh(pGeo, pMat);
            pMesh.position.copy(position);
            Renderer.scene.add(pMesh);
            trail.push(pMesh);
        }

        this.activeOrbs.push({
            mesh,
            trail,
            type: typeKey,
            velocity: -3.5, // units per second downward
            spawnTime: Date.now()
        });
    },

    /**
     * Update orb positions and trails.
     */
    update(dt) {
        const now = Date.now();
        for (let i = this.activeOrbs.length - 1; i >= 0; i--) {
            const orb = this.activeOrbs[i];
            
            // Move orb
            orb.mesh.position.z -= orb.velocity * dt; // moving "down" field (-Z is forward, so +Z is down)
            
            // Check bounds (gone past paddle area)
            if (orb.mesh.position.z > 20) {
                this.remove(i);
                continue;
            }

            // Update trail (Lagging effect)
            for (let j = 0; j < orb.trail.length; j++) {
                const trailPart = orb.trail[j];
                const lerpAmount = 0.1 * (j + 1);
                trailPart.position.lerp(orb.mesh.position, lerpAmount);
                trailPart.material.opacity = 0.5 * (1 - (j / orb.trail.length));
            }
        }
    },

    /**
     * Remove an orb from the scene.
     */
    remove(index) {
        const orb = this.activeOrbs[index];
        if (!orb) return;

        Renderer.scene.remove(orb.mesh);
        orb.mesh.geometry.dispose();
        orb.mesh.material.dispose();

        orb.trail.forEach(t => {
            Renderer.scene.remove(t);
            t.geometry.dispose();
            t.material.dispose();
        });

        this.activeOrbs.splice(index, 1);
    }
};
