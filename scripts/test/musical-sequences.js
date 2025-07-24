/**
 * Musical sequences for shader testing
 * Each sequence simulates different musical moments with parameter animations
 */

export const musicalSequences = {
    "the-drop": {
        duration: 30000,
        description: "Classic EDM drop with tension building and explosive release",
        musicalContext: "Simulates a typical EDM buildup and drop pattern at 140 BPM. The tension rises through filtering and energy increase, then explodes with full bass and kick at the drop moment.",
        screenshotInterval: 5000,
        keyframes: [
            { time: 0, params: { bass: 0.3, kick: 0, mid: 0.4, high: 0.2, energy: 0.2 } },
            { time: 0.1, params: { bass: 0.35, kick: 0, mid: 0.5, high: 0.3, energy: 0.3 } },
            { time: 0.15, params: { bass: 0.4, kick: 0, mid: 0.6, high: 0.4, energy: 0.5 } },
            { time: 0.16, params: { bass: 0.8, kick: 1.0, mid: 0.8, high: 0.9, energy: 1.0, drop: 1.0 } }, // THE DROP!
            { time: 0.3, params: { bass: 0.9, kick: 0.8, mid: 0.7, high: 0.7, energy: 0.9, drop: 0 } },
            { time: 0.5, params: { bass: 0.8, kick: 0.7, mid: 0.6, high: 0.6, energy: 0.8 } },
            { time: 0.8, params: { bass: 0.7, kick: 0.5, mid: 0.5, high: 0.5, energy: 0.6 } },
            { time: 1, params: { bass: 0.5, kick: 0.3, mid: 0.4, high: 0.4, energy: 0.4 } }
        ],
        descriptions: [
            { time: 0, text: "Building tension - bass rumbles in the distance" },
            { time: 0.1, text: "Filters opening, energy rising" },
            { time: 0.15, text: "Final moment before the drop!" },
            { time: 0.16, text: "THE DROP! Bass and kick explode" },
            { time: 0.3, text: "Full energy maintained" },
            { time: 0.5, text: "Groove settling in" },
            { time: 0.8, text: "Energy winding down" }
        ]
    },

    "vampire-waltz": {
        duration: 30000,
        description: "Gothic 3/4 time waltz pattern - melancholy and elegant",
        musicalContext: "A dark waltz at 90 BPM in 3/4 time. Each measure emphasizes the downbeat with bass and kick, creating a hypnotic swaying motion perfect for a vampire's dance.",
        screenshotInterval: 5000,
        keyframes: [
            // Bar 1
            { time: 0, params: { bass: 1.0, kick: 1.0, mid: 0.3, high: 0.2, tempo: 0.643 } }, // 1
            { time: 0.033, params: { bass: 0.4, kick: 0, mid: 0.5, high: 0.3, tempo: 0.643 } }, // 2
            { time: 0.066, params: { bass: 0.4, kick: 0, mid: 0.4, high: 0.3, tempo: 0.643 } }, // 3
            // Bar 2
            { time: 0.1, params: { bass: 1.0, kick: 1.0, mid: 0.4, high: 0.2, tempo: 0.643 } }, // 1
            { time: 0.133, params: { bass: 0.4, kick: 0, mid: 0.6, high: 0.4, tempo: 0.643 } }, // 2
            { time: 0.166, params: { bass: 0.4, kick: 0, mid: 0.5, high: 0.4, tempo: 0.643 } }, // 3
            // Continue pattern...
            { time: 0.5, params: { bass: 0.8, kick: 0.8, mid: 0.7, high: 0.5, tempo: 0.643 } },
            { time: 1, params: { bass: 0.5, kick: 0.5, mid: 0.3, high: 0.2, tempo: 0.643 } }
        ],
        descriptions: [
            { time: 0, text: "The vampire awakens - first waltz step" },
            { time: 0.1, text: "Swaying through the moonlight" },
            { time: 0.5, text: "The dance intensifies" },
            { time: 0.8, text: "Dawn approaches - the waltz slows" }
        ]
    },

    "melodic-journey": {
        duration: 30000,
        description: "Progressive house melodic progression with emotional peaks",
        musicalContext: "Follows a typical progressive house structure with evolving melodies. Mid frequencies carry the main theme while bass provides foundation and highs add sparkle.",
        screenshotInterval: 5000,
        keyframes: [
            { time: 0, params: { bass: 0.5, kick: 0.3, mid: 0.3, high: 0.2, vocal: 0 } },
            { time: 0.2, params: { bass: 0.6, kick: 0.4, mid: 0.7, high: 0.4, vocal: 0.5 } },
            { time: 0.4, params: { bass: 0.7, kick: 0.5, mid: 0.9, high: 0.6, vocal: 0.8 } },
            { time: 0.6, params: { bass: 0.7, kick: 0.5, mid: 0.8, high: 0.7, vocal: 0.6 } },
            { time: 0.8, params: { bass: 0.6, kick: 0.4, mid: 0.5, high: 0.5, vocal: 0.3 } },
            { time: 1, params: { bass: 0.5, kick: 0.3, mid: 0.3, high: 0.3, vocal: 0 } }
        ],
        descriptions: [
            { time: 0, text: "Intro - sparse elements" },
            { time: 0.2, text: "Melody enters with vocals" },
            { time: 0.4, text: "Emotional peak - full arrangement" },
            { time: 0.6, text: "Sustained energy" },
            { time: 0.8, text: "Breaking down" }
        ]
    },

    "techno-hammer": {
        duration: 30000,
        description: "Relentless techno with driving kick pattern",
        musicalContext: "Industrial techno at 135 BPM. Constant kick drum with evolving percussion and acid-style frequency sweeps. Raw and hypnotic.",
        screenshotInterval: 5000,
        keyframes: [
            { time: 0, params: { bass: 0.7, kick: 0.8, mid: 0.2, high: 0.3, energy: 0.7 } },
            { time: 0.125, params: { bass: 0.7, kick: 0.9, mid: 0.3, high: 0.4, energy: 0.75 } },
            { time: 0.25, params: { bass: 0.8, kick: 0.8, mid: 0.4, high: 0.5, energy: 0.8 } },
            { time: 0.375, params: { bass: 0.8, kick: 0.9, mid: 0.5, high: 0.6, energy: 0.85 } },
            { time: 0.5, params: { bass: 0.9, kick: 0.8, mid: 0.6, high: 0.7, energy: 0.9 } },
            { time: 0.75, params: { bass: 0.8, kick: 0.9, mid: 0.4, high: 0.5, energy: 0.8 } },
            { time: 1, params: { bass: 0.7, kick: 0.8, mid: 0.2, high: 0.3, energy: 0.7 } }
        ],
        descriptions: [
            { time: 0, text: "Techno hammer begins" },
            { time: 0.25, text: "Percussion layers building" },
            { time: 0.5, text: "Peak intensity - acid sweep" },
            { time: 0.75, text: "Returning to base groove" }
        ]
    },

    "ambient-drift": {
        duration: 30000,
        description: "Slow ambient evolution with subtle parameter changes",
        musicalContext: "Beatless ambient piece focusing on texture and atmosphere. Parameters change very slowly to create a meditative, evolving soundscape.",
        screenshotInterval: 5000,
        keyframes: [
            { time: 0, params: { bass: 0.2, kick: 0, mid: 0.3, high: 0.4, energy: 0.2, spectral: 0.5 } },
            { time: 0.3, params: { bass: 0.3, kick: 0, mid: 0.4, high: 0.5, energy: 0.3, spectral: 0.6 } },
            { time: 0.5, params: { bass: 0.25, kick: 0, mid: 0.5, high: 0.6, energy: 0.35, spectral: 0.7 } },
            { time: 0.7, params: { bass: 0.2, kick: 0, mid: 0.4, high: 0.5, energy: 0.25, spectral: 0.6 } },
            { time: 1, params: { bass: 0.2, kick: 0, mid: 0.3, high: 0.4, energy: 0.2, spectral: 0.5 } }
        ],
        descriptions: [
            { time: 0, text: "Floating in space" },
            { time: 0.3, text: "Gentle waves of sound" },
            { time: 0.5, text: "Ethereal peak" },
            { time: 0.7, text: "Drifting back" }
        ]
    },

    "drum-and-bass-rush": {
        duration: 30000,
        description: "Fast-paced drum and bass with syncopated rhythms",
        musicalContext: "174 BPM drum and bass with classic Amen break pattern. Sub-bass provides weight while high frequencies create urgency and movement.",
        screenshotInterval: 5000,
        keyframes: [
            { time: 0, params: { bass: 0.3, kick: 0.4, mid: 0.5, high: 0.7, energy: 0.6, tempo: 1.243 } },
            { time: 0.1, params: { bass: 0.9, kick: 0.8, mid: 0.6, high: 0.8, energy: 0.9, tempo: 1.243 } },
            { time: 0.3, params: { bass: 1.0, kick: 0.6, mid: 0.7, high: 0.9, energy: 1.0, tempo: 1.243 } },
            { time: 0.5, params: { bass: 0.8, kick: 0.7, mid: 0.8, high: 0.8, energy: 0.9, tempo: 1.243 } },
            { time: 0.7, params: { bass: 0.9, kick: 0.5, mid: 0.6, high: 0.7, energy: 0.8, tempo: 1.243 } },
            { time: 1, params: { bass: 0.4, kick: 0.3, mid: 0.4, high: 0.5, energy: 0.5, tempo: 1.243 } }
        ],
        descriptions: [
            { time: 0, text: "Breaks rolling in" },
            { time: 0.1, text: "Sub-bass drops heavy" },
            { time: 0.3, text: "Full DnB mayhem" },
            { time: 0.7, text: "Breakdown approaching" }
        ]
    }
};

/**
 * Helper function to get a sequence by name
 */
export function getSequence(name) {
    return musicalSequences[name] || null;
}

/**
 * Get all sequence names
 */
export function getSequenceNames() {
    return Object.keys(musicalSequences);
}

/**
 * Create a custom sequence from parameters
 */
export function createCustomSequence(params) {
    const {
        duration = 30000,
        description = "Custom sequence",
        musicalContext = "",
        keyframes = [],
        screenshotInterval = 5000
    } = params;

    return {
        duration,
        description,
        musicalContext,
        screenshotInterval,
        keyframes,
        descriptions: []
    };
}