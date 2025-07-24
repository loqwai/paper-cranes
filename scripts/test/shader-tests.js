/**
 * Shader Test Definitions
 * 
 * Each shader has a test configuration that defines:
 * - Which parameters to animate
 * - Keyframe animations
 * - Expected behaviors
 * - Validation criteria
 */

export const shaderTests = {
    // Claude-generated shaders
    'claude-generated/quantum-particles': {
        name: 'Quantum Particles',
        description: 'Wave-particle duality visualization',
        animations: [
            {
                name: 'wave-collapse',
                duration: 5000,
                keyframes: [
                    { time: 0, params: { knob_1: 0.3, knob_2: 0.7, knob_3: 0 } },
                    { time: 0.3, params: { knob_1: 0.5, knob_2: 0.7, knob_3: 1 } },
                    { time: 0.6, params: { knob_1: 0.8, knob_2: 0.3, knob_3: 1 } },
                    { time: 1, params: { knob_1: 0.3, knob_2: 0.7, knob_3: 0 } }
                ]
            },
            {
                name: 'particle-size-sweep',
                duration: 3000,
                keyframes: [
                    { time: 0, params: { knob_5: 0.1 } },
                    { time: 0.5, params: { knob_5: 1.0 } },
                    { time: 1, params: { knob_5: 0.1 } }
                ]
            }
        ],
        parameterSweeps: [
            { param: 'knob_1', min: 0, max: 1, steps: 10, name: 'quantum-scale' },
            { param: 'knob_2', min: 0, max: 1, steps: 10, name: 'tunneling-probability' }
        ]
    },

    'claude-generated/liquid-crystal': {
        name: 'Liquid Crystal',
        description: 'Flowing crystalline structures',
        animations: [
            {
                name: 'crystal-flow',
                duration: 6000,
                keyframes: [
                    { time: 0, params: { knob_1: 0.5, knob_2: 0.3, knob_3: 0.5 } },
                    { time: 0.25, params: { knob_1: 1.0, knob_2: 0.3, knob_3: 0.7 } },
                    { time: 0.5, params: { knob_1: 1.0, knob_2: 0.7, knob_3: 0.5 } },
                    { time: 0.75, params: { knob_1: 0.5, knob_2: 0.7, knob_3: 0.3 } },
                    { time: 1, params: { knob_1: 0.5, knob_2: 0.3, knob_3: 0.5 } }
                ]
            }
        ]
    },

    'claude-generated/neural-network': {
        name: 'Neural Network',
        description: 'Synaptic connections visualization',
        animations: [
            {
                name: 'neural-activity',
                duration: 4000,
                keyframes: [
                    { time: 0, params: { knob_1: 0.2, knob_2: 0.5, knob_4: 0.3 } },
                    { time: 0.5, params: { knob_1: 0.8, knob_2: 0.8, knob_4: 1.0 } },
                    { time: 1, params: { knob_1: 0.2, knob_2: 0.5, knob_4: 0.3 } }
                ]
            }
        ]
    },

    'claude-generated/geometric-bloom': {
        name: 'Geometric Bloom',
        description: 'Sacred geometry patterns',
        animations: [
            {
                name: 'bloom-cycle',
                duration: 8000,
                keyframes: [
                    { time: 0, params: { knob_1: 0, knob_2: 0.5, knob_3: 6 } },
                    { time: 0.25, params: { knob_1: 0.5, knob_2: 0.8, knob_3: 8 } },
                    { time: 0.5, params: { knob_1: 1, knob_2: 0.5, knob_3: 12 } },
                    { time: 0.75, params: { knob_1: 0.5, knob_2: 0.2, knob_3: 8 } },
                    { time: 1, params: { knob_1: 0, knob_2: 0.5, knob_3: 6 } }
                ]
            }
        ]
    },

    'claude-generated/aurora-waves': {
        name: 'Aurora Waves',
        description: 'Northern lights simulation',
        animations: [
            {
                name: 'aurora-dance',
                duration: 7000,
                keyframes: [
                    { time: 0, params: { knob_1: 0.3, knob_2: 0.5, knob_3: 0.2 } },
                    { time: 0.33, params: { knob_1: 0.6, knob_2: 0.8, knob_3: 0.5 } },
                    { time: 0.66, params: { knob_1: 0.4, knob_2: 0.3, knob_3: 0.8 } },
                    { time: 1, params: { knob_1: 0.3, knob_2: 0.5, knob_3: 0.2 } }
                ]
            }
        ]
    },

    'claude-generated/fractal-garden': {
        name: 'Fractal Garden',
        description: 'Organic fractal growth',
        animations: [
            {
                name: 'growth-cycle',
                duration: 10000,
                keyframes: [
                    { time: 0, params: { knob_1: 0, knob_2: 0.3, knob_3: 3 } },
                    { time: 0.5, params: { knob_1: 1, knob_2: 0.7, knob_3: 7 } },
                    { time: 1, params: { knob_1: 0, knob_2: 0.3, knob_3: 3 } }
                ]
            }
        ]
    },

    'claude-generated/time-crystals': {
        name: 'Time Crystals',
        description: '4D crystal rotations',
        animations: [
            {
                name: 'temporal-shift',
                duration: 6000,
                keyframes: [
                    { time: 0, params: { knob_1: 0.5, knob_2: 0.5, knob_3: 0 } },
                    { time: 0.5, params: { knob_1: 0.8, knob_2: 0.8, knob_3: 1 } },
                    { time: 1, params: { knob_1: 0.5, knob_2: 0.5, knob_3: 0 } }
                ]
            }
        ]
    },

    'claude-generated/sonic-mandala': {
        name: 'Sonic Mandala',
        description: 'Audio-reactive circular patterns',
        animations: [
            {
                name: 'mandala-rotation',
                duration: 8000,
                keyframes: [
                    { time: 0, params: { knob_1: 3, knob_2: 0, knob_3: 0.5 } },
                    { time: 0.25, params: { knob_1: 5, knob_2: 0.5, knob_3: 0.8 } },
                    { time: 0.5, params: { knob_1: 8, knob_2: 1, knob_3: 0.5 } },
                    { time: 0.75, params: { knob_1: 5, knob_2: 0.5, knob_3: 0.2 } },
                    { time: 1, params: { knob_1: 3, knob_2: 0, knob_3: 0.5 } }
                ]
            }
        ]
    },

    'claude-generated/digital-rain': {
        name: 'Digital Rain',
        description: 'Matrix-style falling code',
        animations: [
            {
                name: 'rain-intensity',
                duration: 5000,
                keyframes: [
                    { time: 0, params: { knob_1: 0.5, knob_3: 0.2, knob_4: 0.5 } },
                    { time: 0.5, params: { knob_1: 1.0, knob_3: 0.8, knob_4: 1.0 } },
                    { time: 1, params: { knob_1: 0.5, knob_3: 0.2, knob_4: 0.5 } }
                ]
            }
        ]
    },

    'claude-generated/cosmic-web': {
        name: 'Cosmic Web',
        description: 'Galaxy filaments and gravitational lensing',
        animations: [
            {
                name: 'cosmic-evolution',
                duration: 12000,
                keyframes: [
                    { time: 0, params: { knob_1: 0.3, knob_2: 0.5, knob_4: 0.2 } },
                    { time: 0.33, params: { knob_1: 0.6, knob_2: 0.8, knob_4: 0.5 } },
                    { time: 0.66, params: { knob_1: 0.5, knob_2: 0.6, knob_4: 0.8 } },
                    { time: 1, params: { knob_1: 0.3, knob_2: 0.5, knob_4: 0.2 } }
                ]
            }
        ]
    },

    // Original shaders - basic animations
    'plasma': {
        name: 'Plasma',
        description: 'Classic plasma effect',
        animations: [
            {
                name: 'plasma-morph',
                duration: 4000,
                keyframes: [
                    { time: 0, params: { knob_1: 0.3, knob_2: 0.3 } },
                    { time: 0.5, params: { knob_1: 0.7, knob_2: 0.7 } },
                    { time: 1, params: { knob_1: 0.3, knob_2: 0.3 } }
                ]
            }
        ]
    },

    'satin': {
        name: 'Satin',
        description: 'Smooth satin-like effect',
        animations: [
            {
                name: 'satin-flow',
                duration: 5000,
                keyframes: [
                    { time: 0, params: { knob_1: 0.5, knob_2: 0.5 } },
                    { time: 0.5, params: { knob_1: 0.8, knob_2: 0.2 } },
                    { time: 1, params: { knob_1: 0.5, knob_2: 0.5 } }
                ]
            }
        ]
    },

    'mandala': {
        name: 'Mandala',
        description: 'Circular mandala patterns',
        animations: [
            {
                name: 'mandala-spin',
                duration: 6000,
                keyframes: [
                    { time: 0, params: { knob_1: 0, knob_2: 0.5 } },
                    { time: 1, params: { knob_1: 1, knob_2: 0.5 } }
                ]
            }
        ]
    },

    'ripples': {
        name: 'Ripples',
        description: 'Water ripple effect',
        animations: [
            {
                name: 'ripple-spread',
                duration: 3000,
                keyframes: [
                    { time: 0, params: { knob_1: 0.1, knob_2: 0.5 } },
                    { time: 0.5, params: { knob_1: 0.5, knob_2: 0.8 } },
                    { time: 1, params: { knob_1: 0.1, knob_2: 0.5 } }
                ]
            }
        ]
    },

    'kaleidoscope': {
        name: 'Kaleidoscope',
        description: 'Kaleidoscope effect',
        animations: [
            {
                name: 'kaleidoscope-turn',
                duration: 8000,
                keyframes: [
                    { time: 0, params: { knob_1: 0, knob_2: 6 } },
                    { time: 0.5, params: { knob_1: 0.5, knob_2: 12 } },
                    { time: 1, params: { knob_1: 1, knob_2: 6 } }
                ]
            }
        ]
    }
};

// Helper function to get all shader paths
export function getAllShaderPaths() {
    return Object.keys(shaderTests);
}

// Helper function to get test for a specific shader
export function getShaderTest(shaderPath) {
    return shaderTests[shaderPath] || null;
}