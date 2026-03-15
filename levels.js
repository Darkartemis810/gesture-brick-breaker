/**
 * levels.js
 * Design for 15 handcrafted levels and a procedural generation system.
 * 
 * Brick Types:
 * 1: Cyan (Normal)
 * 2: Green (2-Hit)
 * 3: Purple (Explosive)
 * 4: Magenta (Regenerating)
 * 5: Orange (Ball-Immune / Smashable)
 */

export const Levels = {
    /**
     * Handcrafted levels 1-15
     */
    data: [
        // Level 1: Intro Wall
        [
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        ],
        // Level 2: The Gradients
        [
            [2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        ],
        // Level 3: Explosive Core
        [
            [1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
            [0, 3, 0, 3, 0, 3, 0, 3, 0, 3],
            [1, 0, 1, 0, 1, 0, 1, 0, 1, 0]
        ],
        // Level 4: The Pillars (Immune Test)
        [
            [5, 1, 1, 5, 2, 2, 5, 1, 1, 5],
            [5, 1, 1, 5, 2, 2, 5, 1, 1, 5],
            [5, 1, 1, 5, 2, 2, 5, 1, 1, 5]
        ],
        // Level 5: Magic Magenta (Regeneration)
        [
            [4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
            [1, 2, 3, 2, 1, 1, 2, 3, 2, 1],
            [4, 4, 4, 4, 4, 4, 4, 4, 4, 4]
        ],
        // Level 6: The Eye
        [
            [2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
            [2, 1, 1, 3, 3, 3, 3, 1, 1, 2],
            [2, 1, 5, 4, 4, 4, 4, 5, 1, 2],
            [2, 1, 1, 3, 3, 3, 3, 1, 1, 2],
            [2, 2, 2, 2, 2, 2, 2, 2, 2, 2]
        ],
        // Level 7: ZigZag Madness
        [
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [2, 1, 0, 0, 0, 0, 0, 0, 1, 2],
            [3, 2, 1, 0, 0, 0, 0, 1, 2, 3],
            [4, 3, 2, 1, 5, 5, 1, 2, 3, 4],
            [3, 2, 1, 0, 0, 0, 0, 1, 2, 3]
        ],
        // Level 8: Checkerboard Elite
        [
            [1, 2, 1, 2, 1, 2, 1, 2, 1, 2],
            [2, 1, 2, 1, 2, 1, 2, 1, 2, 1],
            [3, 4, 3, 4, 3, 4, 3, 4, 3, 4],
            [4, 3, 4, 3, 4, 3, 4, 3, 4, 3],
            [5, 5, 0, 0, 5, 5, 0, 0, 5, 5]
        ],
        // Level 9: The Castle
        [
            [2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
            [2, 0, 0, 0, 0, 0, 0, 0, 0, 2],
            [2, 0, 3, 1, 4, 4, 1, 3, 0, 2],
            [2, 0, 3, 5, 5, 5, 5, 3, 0, 2],
            [2, 2, 2, 2, 2, 2, 2, 2, 2, 2]
        ],
        // Level 10: X-Pattern
        [
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [0, 2, 0, 0, 0, 0, 0, 0, 2, 0],
            [0, 0, 3, 0, 0, 0, 0, 3, 0, 0],
            [0, 0, 0, 4, 5, 5, 4, 0, 0, 0],
            [0, 0, 0, 4, 5, 5, 4, 0, 0, 0],
            [0, 0, 3, 0, 0, 0, 0, 3, 0, 0],
            [0, 2, 0, 0, 0, 0, 0, 0, 2, 0],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 1]
        ],
        // Level 11: Rainbow Wall
        [
            [5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
            [4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
            [3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
            [2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        ],
        // Level 12: Space Invader
        [
            [0, 0, 2, 0, 0, 0, 0, 2, 0, 0],
            [0, 0, 0, 2, 0, 0, 2, 0, 0, 0],
            [0, 0, 2, 2, 2, 2, 2, 2, 0, 0],
            [0, 2, 2, 1, 2, 2, 1, 2, 2, 0],
            [2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
            [2, 0, 2, 2, 2, 2, 2, 2, 0, 2],
            [2, 0, 2, 0, 0, 0, 0, 2, 0, 2],
            [0, 0, 0, 2, 2, 2, 2, 0, 0, 0]
        ],
        // Level 13: The Maze
        [
            [5, 5, 5, 5, 5, 4, 5, 5, 5, 5],
            [1, 0, 0, 0, 5, 0, 0, 0, 0, 5],
            [1, 0, 3, 0, 5, 0, 3, 3, 0, 5],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 5],
            [5, 5, 5, 4, 5, 5, 5, 5, 5, 5]
        ],
        // Level 14: Double Diamond
        [
            [0, 0, 0, 0, 2, 2, 0, 0, 0, 0],
            [0, 0, 0, 2, 4, 4, 2, 0, 0, 0],
            [0, 0, 2, 4, 3, 3, 4, 2, 0, 0],
            [0, 2, 4, 3, 5, 5, 3, 4, 2, 0],
            [0, 0, 2, 4, 3, 3, 4, 2, 0, 0],
            [0, 0, 0, 2, 4, 4, 2, 0, 0, 0],
            [0, 0, 0, 0, 2, 2, 0, 0, 0, 0]
        ],
        // Level 15: Final Challenge
        [
            [5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
            [5, 4, 4, 4, 4, 4, 4, 4, 4, 5],
            [5, 4, 3, 3, 3, 3, 3, 3, 4, 5],
            [5, 4, 3, 2, 2, 2, 2, 3, 4, 5],
            [5, 4, 3, 2, 1, 1, 2, 3, 4, 5]
        ]
    ],

    /**
     * Get or generate level data
     */
    getLevel(index) {
        if (index < this.data.length) {
            return this.data[index];
        } else {
            return this.generateProceduralLevel(index);
        }
    },

    /**
     * Weighted Random Procedural Level Generator
     */
    generateProceduralLevel(index) {
        const rows = Math.min(6 + Math.floor(index / 5), 10);
        const levelData = [];
        
        // Weights change over time
        // type 1 (Standard) weight decreases
        const w1 = Math.max(0.1, 0.4 - (index * 0.01));
        const w2 = 0.2;
        const w3 = 0.1 + (index * 0.005);
        const w4 = 0.1;
        const w5 = 0.05 + (index * 0.005);
        const wNone = 0.15;

        for (let r = 0; r < rows; r++) {
            const row = [];
            for (let c = 0; c < 10; c++) {
                const rand = Math.random();
                if (rand < w1) row.push(1);
                else if (rand < w1 + w2) row.push(2);
                else if (rand < w1 + w2 + w3) row.push(3);
                else if (rand < w1 + w2 + w3 + w4) row.push(4);
                else if (rand < w1 + w2 + w3 + w4 + w5) row.push(5);
                else if (rand < w1 + w2 + w3 + w4 + w5 + wNone) row.push(0);
                else row.push(1);
            }
            levelData.push(row);
        }
        return levelData;
    }
};
