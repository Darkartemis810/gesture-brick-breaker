/**
 * ui.js
 * Handles all DOM manipulation, score updates, notifications, and HUD state.
 */

export const UI = {
    elements: {},
    
    init() {
        this.elements = {
            score: document.getElementById('score-display'),
            level: document.getElementById('level-display'),
            combo: document.getElementById('combo-display'),
            startBtn: document.getElementById('start-btn'),
            overlay: document.getElementById('overlay-screen'),
            overlayTitle: document.getElementById('overlay-title'),
            overlayMsg: document.getElementById('overlay-msg'),
            smashFlash: document.getElementById('smash-flash'),
            statusBadge: document.getElementById('status-badge'),
            lives: document.getElementById('lives-display'),
            
            gestures: {
                open: document.getElementById('gesture-open'),
                fist: document.getElementById('gesture-fist'),
                punch: document.getElementById('gesture-punch')
            },
            
            webcamVideo: document.getElementById('webcam-video'),
            webcamCanvas: document.getElementById('webcam-canvas'),
        };
        
        // Grab context for skeleton drawing
        this.ctx = this.elements.webcamCanvas.getContext('2d');
    },

    setScore(score) {
        this.elements.score.textContent = String(score).padStart(5, '0');
    },

    setLevel(level) {
        this.elements.level.textContent = String(level).padStart(2, '0');
    },

    setCombo(combo) {
        this.elements.combo.textContent = `x${combo}`;
        if (combo >= 5) {
            this.elements.combo.classList.add('text-neon-cyan');
        } else {
            this.elements.combo.classList.remove('text-neon-cyan');
        }
    },

    setLives(livesCount) {
        this.elements.lives.innerHTML = '';
        for (let i = 0; i < livesCount; i++) {
            const heart = document.createElement('span');
            heart.textContent = '❤️';
            heart.className = 'text-red-500';
            this.elements.lives.appendChild(heart);
        }
    },

    showOverlay(title, msg) {
        this.elements.overlayTitle.textContent = title;
        this.elements.overlayMsg.textContent = msg;
        this.elements.overlay.classList.remove('hidden');
    },

    hideOverlay() {
        this.elements.overlay.classList.add('hidden');
    },

    triggerSmashFlash() {
        this.elements.smashFlash.style.opacity = '0.6';
        setTimeout(() => {
            this.elements.smashFlash.style.opacity = '0';
        }, 200);
    },

    updateGestureStatus(state) {
        // Reset all opacity
        Object.values(this.elements.gestures).forEach(el => {
            el.classList.remove('opacity-100');
            el.classList.add('opacity-50');
            el.querySelector('div').classList.remove('shadow-neon-cyan', 'shadow-neon-magenta');
        });

        // Set badge text and styling
        const b = this.elements.statusBadge;
        b.className = "py-3 px-4 rounded-md text-center font-bold tracking-widest uppercase transition-colors duration-300 ";

        if (!state.active) {
            b.textContent = "WAITING FOR CAMERA";
            b.classList.add('bg-gray-800', 'text-gray-400');
            return;
        }

        switch (state.type) {
            case 'open':
                this.elements.gestures.open.classList.add('opacity-100');
                this.elements.gestures.open.querySelector('div').classList.add('shadow-neon-cyan');
                b.textContent = "TRACKING";
                b.classList.add('bg-brand-neonCyan/20', 'text-brand-neonCyan', 'border', 'border-brand-neonCyan/50');
                break;
            case 'fist':
                this.elements.gestures.fist.classList.add('opacity-100');
                this.elements.gestures.fist.querySelector('div').classList.add('shadow-neon-cyan'); // Or purple
                b.textContent = "CONTROLLING";
                b.classList.add('bg-brand-neonPurple/20', 'text-brand-neonPurple', 'border', 'border-brand-neonPurple/50');
                break;
            case 'punch':
                this.elements.gestures.punch.classList.add('opacity-100');
                this.elements.gestures.punch.querySelector('div').classList.add('shadow-neon-magenta');
                b.textContent = "SMASH READY";
                b.classList.add('bg-brand-neonMagenta/20', 'text-brand-neonMagenta', 'border', 'border-brand-neonMagenta/50');
                break;
            default:
                b.textContent = "NO HAND DETECTED";
                b.classList.add('bg-gray-800', 'text-gray-400');
                break;
        }
    },
    
    clearWebcamCanvas() {
        const c = this.elements.webcamCanvas;
        this.ctx.clearRect(0, 0, c.width, c.height);
    },

    drawSkeleton(landmarks) {
        const c = this.elements.webcamCanvas;
        const ctx = this.ctx;
        
        ctx.save();
        ctx.clearRect(0, 0, c.width, c.height);
        
        // MediaPipe provides drawConnectors & drawLandmarks globally
        window.drawConnectors(ctx, landmarks, window.HAND_CONNECTIONS, {color: '#00f3ff', lineWidth: 2});
        window.drawLandmarks(ctx, landmarks, {color: '#ff00ff', lineWidth: 1, radius: 2});
        
        ctx.restore();
    }
};
