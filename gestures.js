/**
 * gestures.js
 * Advanced gesture classification system.
 * 
 * Ported from Python feature engineering logic:
 * - Wrist-relative and scale-invariant normalization.
 * - Distance and angle feature extraction.
 * - 5-frame majority-vote smoothing.
 * - 5 Gestures: OPEN_HAND, FIST, PINCH, PUNCH, PEACE.
 */

import { UI } from './ui.js';

export const Gestures = {
    hands: null,
    camera: null,
    
    // Result state exposed to game.js
    state: {
        active: false,
        type: 'none',       // Smooth result: 'open', 'fist', 'pinch', 'punch', 'peace'
        confidence: 0,      // Majority-vote ratio
        paddleX: 0.5,       // EMA-smoothed normalized [0, 1]
        rawX: 0.5,
        smashCooldown: 0    // Internal tracking for UI/gameplay
    },
    
    // Internal tracking for smoothing and velocity
    _internal: {
        history: [],        // Recent classification types for majority voting
        zHistory: [],       // Recent palm depth for velocity
        lastZ: 0,
        lastTime: Date.now()
    },

    config: {
        emaAlpha: 0.25,      // Smoothness of paddle movement
        deadzone: 0.005,     // Sensitivity of paddle movement
        bufferSize: 5,       // Majority vote window
        punchZThreshold: -0.04, // forward velocity threshold
        pinchThreshold: 0.15, // normalized distance threshold
        peaceExtensionThreshold: 0.8 // normalized extension threshold
    },

    /**
     * Initialize MediaPipe Hands and webcam stream.
     */
    async init() {
        const videoElement = UI.elements.webcamVideo;
        const canvasElement = UI.elements.webcamCanvas;
        
        videoElement.addEventListener('loadeddata', () => {
            canvasElement.width = videoElement.videoWidth;
            canvasElement.height = videoElement.videoHeight;
        });

        // Load Hands from global CDNs
        const Hands = window.Hands || window.mpHands?.Hands;
        if (!Hands) {
            console.error("MediaPipe Hands library not loaded!");
            return;
        }
        
        this.hands = new Hands({locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }});
        
        this.hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        
        this.hands.onResults(this.onResults.bind(this));

        const Camera = window.Camera || window.mpCamera?.Camera;
        if (!Camera) {
             console.error("MediaPipe Camera util not loaded!");
             return;
        }

        this.camera = new Camera(videoElement, {
            onFrame: async () => {
                await this.hands.send({image: videoElement});
            },
            width: 640,
            height: 480
        });
        
        this.camera.start();
        console.log("Advanced Gesture System Initialized.");
    },

    /**
     * Process high-level results from MediaPipe.
     */
    onResults(results) {
        if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
            this.state.active = false;
            this.state.type = 'none';
            this._internal.history = [];
            UI.updateGestureStatus(this.state);
            UI.clearWebcamCanvas();
            return;
        }

        this.state.active = true;
        const landmarks = results.multiHandLandmarks[0];
        
        // 1. Draw debug info
        UI.drawSkeleton(landmarks);
        
        // 2. Normalize and Classify
        const rawType = this.classify(landmarks);
        this.smoothType(rawType);
        
        // 3. Compute Paddle Position (EMA)
        let rawX = 1.0 - landmarks[9].x; // Mirrored
        rawX = Math.max(0, Math.min(1, rawX));
        
        if (Math.abs(rawX - this.state.rawX) > this.config.deadzone) {
            this.state.rawX = rawX;
        }
        this.state.paddleX = (this.config.emaAlpha * this.state.rawX) + ((1 - this.config.emaAlpha) * this.state.paddleX);

        // 4. Update UI
        UI.updateGestureStatus(this.state);
    },

    /**
     * Performs geometrical classification using normalized landmarks.
     */
    classify(landmarks) {
        // Step A: Basic Math Helpers
        const dist = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) + Math.pow(p1.z - p2.z, 2));
        
        // Reference length (wrist to middle MCP) for scale invariance
        const refDist = dist(landmarks[0], landmarks[9]);
        if (refDist < 0.01) return 'none';

        // Step B: Feature Extraction
        // Extensions (distance from tip to corresponding MCP normalized by refDist)
        const extensions = [
            dist(landmarks[4], landmarks[2]) / refDist,  // Thumb
            dist(landmarks[8], landmarks[5]) / refDist,  // Index
            dist(landmarks[12], landmarks[9]) / refDist, // Middle
            dist(landmarks[16], landmarks[13]) / refDist,// Ring
            dist(landmarks[20], landmarks[17]) / refDist // Pinky
        ];

        // Pinch check (Thumb tip to Index tip)
        const pinchDist = dist(landmarks[4], landmarks[8]) / refDist;

        // Punch/Z-Velocity check
        const avgZ = (landmarks[5].z + landmarks[9].z + landmarks[13].z + landmarks[17].z) / 4;
        const now = Date.now();
        const dt = (now - this._internal.lastTime) / 1000;
        let zVelocity = 0;
        if (dt > 0) {
            zVelocity = (avgZ - this._internal.lastZ) / dt;
        }
        this._internal.lastZ = avgZ;
        this._internal.lastTime = now;

        // Step C: Decision Logic (Rules)
        
        // 1. PUNCH (Dynamic check)
        if (zVelocity < this.config.punchZThreshold) {
            return 'punch';
        }

        // 2. PINCH
        if (pinchDist < this.config.pinchThreshold) {
            return 'pinch';
        }

        // 3. PEACE (Only index and middle extended)
        if (extensions[1] > this.config.peaceExtensionThreshold && 
            extensions[2] > this.config.peaceExtensionThreshold &&
            extensions[3] < 0.6 && extensions[4] < 0.6) {
            return 'peace';
        }

        // 4. FIST vs OPEN_HAND
        const extendedCount = extensions.filter(e => e > 0.7).length;
        if (extendedCount <= 1) return 'fist';
        if (extendedCount >= 4) return 'open';

        return 'open'; // Default fallback
    },

    /**
     * Smoothes the gesture type using a majority vote buffer.
     */
    smoothType(newType) {
        this._internal.history.push(newType);
        if (this._internal.history.length > this.config.bufferSize) {
            this._internal.history.shift();
        }

        // Count occurrences
        const counts = {};
        this._internal.history.forEach(t => counts[t] = (counts[t] || 0) + 1);

        // Find winner
        let winner = 'none';
        let maxCount = 0;
        for (const t in counts) {
            if (counts[t] > maxCount) {
                maxCount = counts[t];
                winner = t;
            }
        }

        this.state.type = winner;
        this.state.confidence = maxCount / this._internal.history.length;
    }
};
