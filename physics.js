/**
 * physics.js
 * Wraps @dimforge/rapier3d. Manages world stepping and object synchronization.
 */

import * as RAPIER from '@dimforge/rapier3d';

export const Physics = {
    world: null,
    bodies: new Map(), // Map Three Mesh ID -> Rapier RigidBody
    
    async init() {
        // Rapier initialization must be awaited via default export WASM boot
        // Using top level import map resolution
        await RAPIER.init();
        
        // Create Physics World (Gravity Y down)
        // Set gravity to 0 if we want a top-down pure arcade feel, 
        // but powerups falling require gravity. We can use gravity and set Ball to ignore it.
        this.world = new RAPIER.World({ x: 0.0, y: -9.81, z: 0.0 });
        console.log("Rapier3D initialized.");
    },

    step() {
        if (!this.world) return;
        this.world.step();
        
        // Sync Visuals — update ALL bodies (dynamic + kinematic)
        this.bodies.forEach((body, mesh) => {
            const translation = body.translation();
            const rotation = body.rotation();
            mesh.position.set(translation.x, translation.y, translation.z);
            mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
        });
    },

    addBall(mesh, radius, startVel) {
        // Dynamic body, unaffected by gravity
        const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(mesh.position.x, mesh.position.y, mesh.position.z)
            .setGravityScale(0) // Crucial: ball doesn't fall from gravity
            .setCcdEnabled(true); // Continuous collision detection for fast balls
            
        const body = this.world.createRigidBody(bodyDesc);
        
        // Collider with perfect bounce (restitution 1.0), zero friction
        const colliderDesc = RAPIER.ColliderDesc.ball(radius)
            .setRestitution(1.0)
            .setFriction(0.0)
            .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
            
        this.world.createCollider(colliderDesc, body);
        
        // Initial Velocity
        body.setLinvel({x: startVel.x, y: startVel.y, z: startVel.z}, true);
        
        this.bodies.set(mesh, body);
        return { body, collider: body.collider(0) };
    },

    addPaddle(mesh, width, height, depth) {
        // Kinematic position based body (moved by user gestures)
        const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
            .setTranslation(mesh.position.x, mesh.position.y, mesh.position.z);
            
        const body = this.world.createRigidBody(bodyDesc);
        
        const colliderDesc = RAPIER.ColliderDesc.cuboid(width/2, height/2, depth/2)
            .setRestitution(1.0)
            .setFriction(0.0);
            
        this.world.createCollider(colliderDesc, body);
        
        this.bodies.set(mesh, body);
        return body;
    },

    addBrick(mesh, width, height, depth, userData) {
        // Kinematic or fixed (we want it fixed so it doesn't move when hit)
        const bodyDesc = RAPIER.RigidBodyDesc.fixed()
            .setTranslation(mesh.position.x, mesh.position.y, mesh.position.z);
            
        const body = this.world.createRigidBody(bodyDesc);
        
        const colliderDesc = RAPIER.ColliderDesc.cuboid(width/2, height/2, depth/2)
            .setRestitution(1.0)
            .setFriction(0.0)
            .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
            
        const collider = this.world.createCollider(colliderDesc, body);
        
        // Attach user data for logical tracking (hit points, brick type)
        body.userData = userData; 
        
        this.bodies.set(mesh, body);
        return { body, collider };
    },

    addWall(x, y, z, w, h, d) {
        const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z);
        const body = this.world.createRigidBody(bodyDesc);
        const colliderDesc = RAPIER.ColliderDesc.cuboid(w/2, h/2, d/2)
             .setRestitution(1.0)
             .setFriction(0.0);
        this.world.createCollider(colliderDesc, body);
        return body;
    },
    
    addLoseSensor(yPos, width, depth) {
        const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, yPos, 0);
        const body = this.world.createRigidBody(bodyDesc);
        const colliderDesc = RAPIER.ColliderDesc.cuboid(width/2, 1.0, depth/2)
             .setSensor(true)
             .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
        return this.world.createCollider(colliderDesc, body);
    },

    removeObject(mesh, body) {
        if (!body) body = this.bodies.get(mesh);
        if (body) {
            this.world.removeRigidBody(body);
            this.bodies.delete(mesh);
        }
    },
    
    spanDebris(pos, color, count=8) {
        const debris = [];
        for (let i = 0; i < count; i++) {
            const size = 0.2 + Math.random() * 0.3;
            // Mesh created externally by renderer usually, but 
            // the physics body is made here
            const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
                .setTranslation(
                    pos.x + (Math.random()-0.5), 
                    pos.y + (Math.random()-0.5), 
                    pos.z + (Math.random()-0.5)
                );
            const body = this.world.createRigidBody(bodyDesc);
            const colliderDesc = RAPIER.ColliderDesc.cuboid(size/2, size/2, size/2)
                .setMass(0.1);
            this.world.createCollider(colliderDesc, body);
            
            // Random explosion impulse
            body.applyImpulse({
                x: (Math.random() - 0.5) * 5,
                y: 2 + Math.random() * 5,
                z: (Math.random() - 0.5) * 5
            }, true);
            
            // Random spin
            body.applyTorqueImpulse({
                x: Math.random() - 0.5,
                y: Math.random() - 0.5,
                z: Math.random() - 0.5
            }, true);
            
            debris.push({ body, size, spawnTime: Date.now() });
        }
        return debris;
    }
};
