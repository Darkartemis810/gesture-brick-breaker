/**
 * gestures.js
 * Initializes MediaPipe Hands. Extracts 21 landmarks, classifies gestures,
 * and maintains the EMA-smoothed paddle control output.
 */

import { UI } from './ui.js';

export const Gestures = {
    hands: null,
    camera: null,
    
    state: {
        active: false,
        type: 'none', // 'open', 'fist', 'punch', 'none'
        paddleX: 0.5, // Normalized [0, 1]
        rawX: 0.5,
        lastZ: [],
        zVelocity: 0,
        smashCooldown: 0
    },
    
    config: {
        emaAlpha: 0.20, // Slightly more responsive
        deadzone: 0.01,  // Lower deadzone for better micro-adjustments
        zHistoryLen: 5,
        punchZThreshold: -0.05, // Sharp decrease in relative depth
        punchVThreshold: -0.015
    },

    async init() {
        const videoElement = UI.elements.webcamVideo;
        const canvasElement = UI.elements.webcamCanvas;
        
        // Need exact matching sizes for the canvas drawing to align
        videoElement.addEventListener('loadeddata', () => {
            canvasElement.width = videoElement.videoWidth;
            canvasElement.height = videoElement.videoHeight;
        });

        // Initialize MediaPipe Hands globally loaded via CDN
        const Hands = window.Hands || window.mpHands?.Hands;
        if (!Hands) {
            console.error("MediaPipe Hands library not loaded from CDN!");
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
             console.error("MediaPipe Camera util not loaded from CDN!");
             return;
        }

        // Start WebCam
        this.camera = new Camera(videoElement, {
            onFrame: async () => {
                await this.hands.send({image: videoElement});
            },
            width: 640,
            height: 480
        });
        
        this.camera.start();
        console.log("MediaPipe initialized and camera started.");
    },

    onResults(results) {
        if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
            this.state.active = false;
            this.state.type = 'none';
            UI.updateGestureStatus(this.state);
            UI.clearWebcamCanvas();
            return;
        }

        this.state.active = true;
        const landmarks = results.multiHandLandmarks[0]; // Primary hand
        
        // Draw real-time dots
        UI.drawSkeleton(landmarks);
        
        // Classify Gesture
        this.classifyGesture(landmarks);
        
        // Compute Paddle Control (EMA Smoothing)
        // Use Index MCP (landmark 5) or Middle MCP (landmark 9) X coord
        // Important: Image is mirrored horizontally natively, so X needs reversing 
        // to feel natural if tracking from webcam, but standard MP mirrored means 1.0 - x
        let rawX = 1.0 - landmarks[9].x; 
        
        // Clamp to play area
        rawX = Math.max(0.05, Math.min(0.95, rawX));
        
        // Deadzone check
        if (Math.abs(rawX - this.state.rawX) > this.config.deadzone) {
            this.state.rawX = rawX;
        }
        
        // Exponential Moving Average
        this.state.paddleX = (this.config.emaAlpha * this.state.rawX) + ((1 - this.config.emaAlpha) * this.state.paddleX);

        // Update UI Side Panel
        UI.updateGestureStatus(this.state);
    },
    
    classifyGesture(landmarks) {
        // Landmarks: 0=wrist, 5=index MCP, 8=index tip
        
        const dist = (p1, p2) => Math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2);
        
        // A finger is folded if its tip is closer to the wrist than its MCP is to the wrist
        // Or closer compared to the PIP joint. We use a simple ratio check for robustness.
        const isFingerClosed = (tipIdx, mcpIdx) => {
            return dist(landmarks[tipIdx], landmarks[0]) < dist(landmarks[mcpIdx], landmarks[0]) * 1.2;
        };

        // Check if index, middle, ring, pinky are folded
        const closedCount = [
            isFingerClosed(8, 5),
            isFingerClosed(12, 9),
            isFingerClosed(16, 13),
            isFingerClosed(20, 17)
        ].filter(Boolean).length;

        // If at least 3 fingers are folded, count it as a fist. This makes it much more forgiving.
        if (closedCount >= 3) {
            this.state.type = 'fist';
        } else {
            this.state.type = 'open';
        }
        
        // Punch Detection (Smash Mode) using Z-Depth velocity of the Wrist/Palm
        // MediaPipe Z is roughly proportional to distance from camera relative to wrist.
        // Averaging Z of MCPs gives a more stable proxy for "hand depth scale"
        const avgZ = (landmarks[5].z + landmarks[9].z + landmarks[13].z + landmarks[17].z) / 4.0;
        
        this.state.lastZ.push(avgZ);
        if (this.state.lastZ.length > this.config.zHistoryLen) {
            this.state.lastZ.shift();
        }
        
        if (this.state.lastZ.length === this.config.zHistoryLen) {
            // Calculate pseudo velocity
            this.state.zVelocity = this.state.lastZ[this.config.zHistoryLen - 1] - this.state.lastZ[0];
            
            // If z-velocity is very negative, hand moved rapidly toward camera
            if (this.state.zVelocity < this.config.punchVThreshold && Date.now() > this.state.smashCooldown) {
                this.state.type = 'punch';
                // Note: The game loop consumes this state and handles the 8s cooldown UI.
            }
        }
    }
};
