/**
 * ui.js
 * Manages all DOM-based UI, HUD cooldown arcs, skeleton drawing,
 * and the local-storage leaderboard.
 */

export const UI = {
    elements: {
        score: document.getElementById('score-val'),
        lives: document.getElementById('lives-val'),
        level: document.getElementById('level-val'),
        combo: document.getElementById('combo-val'),
        overlay: document.getElementById('overlay-screen'),
        overlayTitle: document.getElementById('overlay-title'),
        overlayMsg: document.getElementById('overlay-msg'),
        webcamVideo: document.getElementById('webcam-video'),
        webcamCanvas: document.getElementById('webcam-canvas'),
        gestures: {
            open: document.getElementById('gesture-open'),
            fist: document.getElementById('gesture-fist'),
            pinch: document.getElementById('gesture-pinch'),
            punch: document.getElementById('gesture-punch'),
            peace: document.getElementById('gesture-peace'),
        },
        confidenceBar: document.getElementById('confidence-bar-fill'),
        laserArc: document.getElementById('laser-arc'),
        smashArc: document.getElementById('smash-arc'),
        freezeIcon: document.getElementById('freeze-icon'),
        leaderboardList: document.getElementById('leaderboard-list'),
        nameEntry: document.getElementById('name-entry-container'),
        playerName: document.getElementById('player-name-val'),
        smashFlash: document.getElementById('smash-flash'),
        comboPopup: document.getElementById('combo-popup')
    },

    ctx: null,

    init() {
        this.ctx = this.elements.webcamCanvas.getContext('2d');
        this.updateLeaderboard();
    },

    updateHUD(state) {
        this.elements.score.textContent = state.score.toLocaleString();
        this.elements.lives.textContent = state.lives;
        this.elements.level.textContent = (state.level + 1);
        this.elements.combo.textContent = `x${state.combo}`;

        // Cooldown Arcs (SVG DashOffset)
        // 5s Laser, 8s Smash
        this.updateArc(this.elements.laserArc, state.cooldowns.laser, 5);
        this.updateArc(this.elements.smashArc, state.cooldowns.smash, 8);
        
        // Freeze Icon
        if (state.cooldowns.freeze > 0) {
            this.elements.freezeIcon.classList.remove('grayscale', 'opacity-30');
            this.elements.freezeIcon.classList.add('text-brand-neonCyan');
        } else {
            this.elements.freezeIcon.classList.add('grayscale', 'opacity-30');
        }
    },

    updateArc(el, remaining, total) {
        if (!el) return;
        const progress = Math.max(0, remaining / total);
        const offset = 100 * progress; // Assuming pathLength="100" in SVG
        el.style.strokeDashoffset = offset;
    },

    updateGestureStatus(state) {
        // Update selection opacity
        Object.keys(this.elements.gestures).forEach(k => {
            const el = this.elements.gestures[k];
            if (k === state.type) {
                el.style.opacity = "1.0";
                el.classList.add('ring-2', 'ring-brand-neonCyan');
            } else {
                el.style.opacity = "0.3";
                el.classList.remove('ring-2', 'ring-brand-neonCyan');
            }
        });

        // Confidence Bar
        if (this.elements.confidenceBar) {
            this.elements.confidenceBar.style.width = `${state.confidence * 100}%`;
        }
    },

    showGameOver(state) {
        this.elements.overlay.classList.remove('hidden');
        this.elements.overlay.classList.add('flex');
        this.elements.overlayTitle.textContent = "GAME OVER";
        this.elements.overlayMsg.textContent = `Final Score: ${state.score.toLocaleString()}`;
        this.elements.overlay.style.pointerEvents = 'auto';

        // Show name entry
        this.elements.nameEntry.classList.remove('hidden');
        this.elements.nameEntry.classList.add('flex');
        
        const saveBtn = document.getElementById('save-score-btn');
        saveBtn.onclick = () => {
            const name = document.getElementById('player-name-input').value.trim() || "ANON";
            this.saveScore(name, state);
            this.elements.nameEntry.classList.add('hidden');
            this.updateLeaderboard();
        };
    },

    saveScore(name, state) {
        const counts = state.stats.gestures;
        const distinct = Object.values(counts).filter(v => v > 0).length;
        let badge = "NOVICE";
        if (distinct >= 5) badge = "MAESTRO";
        else if (distinct >= 3) badge = "TACTICIAN";

        const entry = {
            name: name.substring(0, 12),
            score: state.score,
            level: state.level + 1,
            badge: badge,
            date: new Date().toLocaleDateString()
        };

        let scores = JSON.parse(localStorage.getItem('gbb_scores') || '[]');
        scores.push(entry);
        scores.sort((a,b) => b.score - a.score);
        localStorage.setItem('gbb_scores', JSON.stringify(scores.slice(0, 10)));
    },

    updateLeaderboard() {
        const scores = JSON.parse(localStorage.getItem('gbb_scores') || '[]');
        this.elements.leaderboardList.innerHTML = '';
        scores.forEach(s => {
            const li = document.createElement('li');
            li.className = 'flex justify-between w-full border-b border-white/10 pb-1 text-sm';
            li.innerHTML = `
                <span><span class="text-gray-500 mr-2">${s.badge}</span>${s.name}</span>
                <span class="text-brand-neonMagenta font-mono">${s.score.toLocaleString()}</span>
            `;
            this.elements.leaderboardList.appendChild(li);
        });
        document.getElementById('leaderboard-container').classList.remove('hidden');
    },

    hideOverlay() {
        this.elements.overlay.classList.add('hidden');
        this.elements.overlay.classList.remove('flex');
        this.elements.overlay.style.pointerEvents = 'none';
        this.elements.nameEntry.classList.add('hidden');
    },

    showFlash(color, duration) {
        const flash = this.elements.smashFlash;
        flash.style.backgroundColor = color;
        flash.style.opacity = '1';
        setTimeout(() => flash.style.opacity = '0', duration);
    },

    drawSkeleton(landmarks) {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.elements.webcamCanvas.width, this.elements.webcamCanvas.height);
        
        // Draw connections
        const connections = [
            [0, 1, 2, 3, 4], [0, 5, 6, 7, 8], [0, 9, 10, 11, 12],
            [0, 13, 14, 15, 16], [0, 17, 18, 19, 20], [5, 9, 13, 17, 5]
        ];
        
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = '#00f3ff';
        this.ctx.fillStyle = '#ff00ff';

        connections.forEach(path => {
            this.ctx.beginPath();
            path.forEach((idx, i) => {
                const x = landmarks[idx].x * this.elements.webcamCanvas.width;
                const y = landmarks[idx].y * this.elements.webcamCanvas.height;
                if (i === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
            });
            this.ctx.stroke();
        });

        landmarks.forEach(lm => {
            const x = lm.x * this.elements.webcamCanvas.width;
            const y = lm.y * this.elements.webcamCanvas.height;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 4, 0, Math.PI * 2);
            this.ctx.fill();
        });
    },

    clearWebcamCanvas() {
        if (this.ctx) this.ctx.clearRect(0, 0, 1000, 1000);
    }
};
