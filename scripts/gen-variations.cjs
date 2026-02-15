#!/usr/bin/env node
// Generate clit variation shaders from parameter table
// Each variation uses the proven clit/2-4 template with unique parameters
//
// Color fidelity notes:
// - Filigree (filR/G/B) kept neutral/pearly — all channels within 0.15 of each other
// - Gamma (gammaR/G/B) kept flat — all channels within 0.03 of each other
// - Color phase audio multipliers 2.5-4.0 for full rainbow cycling
// - Names describe the visual output, not a mood board

const fs = require('fs')
const path = require('path')

const variations = [
  {
    name: 'coral-polyp',
    tags: 'coral, reef, organic, clit-variation',
    desc: 'Coral Polyp — Twitchy tendrils, x-dominant wing spread, fast detail cycling',
    aLow: 1.5, aHigh: 2.0, aSine: 0.02, bBase: 0.48, bAudio: 0.12, bSine: 0.025,
    camX: 0.80, camY: -0.03, scale: 0.6,
    laceStyle: 'x-dom', lacePow: 3.5,
    colorPhaseBase: 0.4, colorPhaseAudio: 'pitchClassNormalized * 3.2',
    flapRate: 0.35, flapAmp: 0.2, feedback: 0.15,
    gemR: 1.0, gemG: 0.45, gemB: 0.35,
    rimR: 0.45, rimG: 0.40, rimB: 0.50,
    bgR: 0.04, bgG: 0.01, bgB: 0.03,
    filR: 0.65, filG: 0.60, filB: 0.70,
    gammaR: 0.89, gammaG: 0.90, gammaB: 0.91,
    beatR: 0.12, beatG: 0.04, beatB: 0.02,
  },
  {
    name: 'deep-sea',
    tags: 'deep-sea, bioluminescent, ocean, clit-variation',
    desc: 'Deep Sea — Smooth wide forms, glacial drift, heavy ghosted trails',
    aLow: 1.2, aHigh: 1.6, aSine: 0.015, bBase: 0.58, bAudio: 0.10, bSine: 0.02,
    camX: 0.72, camY: 0.0, scale: 0.6,
    laceStyle: 'y-dom', lacePow: 2.0,
    colorPhaseBase: 1.2, colorPhaseAudio: 'spectralEntropyNormalized * 2.8',
    flapRate: 0.06, flapAmp: 0.5, feedback: 0.45,
    gemR: 0.3, gemG: 0.85, gemB: 1.0,
    rimR: 0.40, rimG: 0.45, rimB: 0.50,
    bgR: 0.005, bgG: 0.01, bgB: 0.04,
    filR: 0.60, filG: 0.65, filB: 0.70,
    gammaR: 0.90, gammaG: 0.89, gammaB: 0.88,
    beatR: 0.02, beatG: 0.08, beatB: 0.12,
  },
  {
    name: 'dream-catcher',
    tags: 'dream, web, pastel, clit-variation',
    desc: 'Dream Catcher — Tight mesh web, high complexity, pastel rainbow cycling',
    aLow: 1.6, aHigh: 2.1, aSine: 0.022, bBase: 0.45, bAudio: 0.10, bSine: 0.028,
    camX: 0.85, camY: 0.08, scale: 0.6,
    laceStyle: 'mesh', lacePow: 2.0,
    colorPhaseBase: -0.3, colorPhaseAudio: 'spectralCentroidNormalized * 3.5',
    laceLoOverride: -1.0, laceHiOverride: -4.5,
    flapRate: 0.15, flapAmp: 0.25, feedback: 0.28,
    gemR: 0.85, gemG: 0.45, gemB: 0.8,
    rimR: 0.45, rimG: 0.40, rimB: 0.50,
    bgR: 0.03, bgG: 0.01, bgB: 0.05,
    filR: 0.68, filG: 0.62, filB: 0.72,
    gammaR: 0.89, gammaG: 0.90, gammaB: 0.88,
    beatR: 0.1, beatG: 0.04, beatB: 0.08,
  },
  {
    name: 'eclipse',
    tags: 'eclipse, corona, solar, clit-variation',
    desc: 'Eclipse — Grand smooth corona, glacial sweep, strong rim glow',
    aLow: 1.1, aHigh: 1.5, aSine: 0.012, bBase: 0.62, bAudio: 0.08, bSine: 0.018,
    camX: 0.70, camY: 0.0, scale: 0.58,
    laceStyle: 'balanced', lacePow: 3.5,
    colorPhaseBase: 2.0, colorPhaseAudio: 'spectralRoughnessNormalized * 2.5',
    flapRate: 0.04, flapAmp: 0.6, feedback: 0.2,
    rimIntensityBase: 0.5, rimIntensityAudio: 0.7,
    gemR: 1.0, gemG: 0.85, gemB: 0.4,
    rimR: 0.45, rimG: 0.42, rimB: 0.40,
    bgR: 0.01, bgG: 0.005, bgB: 0.02,
    filR: 0.65, filG: 0.62, filB: 0.60,
    gammaR: 0.89, gammaG: 0.90, gammaB: 0.91,
    beatR: 0.12, beatG: 0.08, beatB: 0.02,
  },
  {
    name: 'electric-nerve',
    tags: 'electric, nerve, cyber, clit-variation',
    desc: 'Electric Nerve — Dense fiber detail, fast twitchy x-spread, sharp edges',
    aLow: 1.7, aHigh: 2.2, aSine: 0.03, bBase: 0.42, bAudio: 0.14, bSine: 0.035,
    camX: 0.82, camY: 0.0, scale: 0.6,
    laceStyle: 'x-dom', lacePow: 4.0,
    colorPhaseBase: 3.2, colorPhaseAudio: 'spectralFluxNormalized * 3.8',
    flapRate: 0.45, flapAmp: 0.2, feedback: 0.12,
    gemR: 0.6, gemG: 1.0, gemB: 1.0,
    rimR: 0.50, rimG: 0.48, rimB: 0.52,
    bgR: 0.005, bgG: 0.005, bgB: 0.025,
    filR: 0.70, filG: 0.72, filB: 0.68,
    gammaR: 0.90, gammaG: 0.89, gammaB: 0.88,
    beatR: 0.03, beatG: 0.1, beatB: 0.12,
  },
  {
    name: 'frozen-crystal',
    tags: 'ice, crystal, frozen, clit-variation',
    desc: 'Frozen Crystal — Grand smooth forms, glacial zoom, heavy persistent trails',
    aLow: 1.0, aHigh: 1.4, aSine: 0.01, bBase: 0.65, bAudio: 0.08, bSine: 0.015,
    camX: 0.68, camY: 0.02, scale: 0.55,
    laceStyle: 'balanced', lacePow: 2.5,
    colorPhaseBase: 4.0, colorPhaseAudio: 'spectralSpreadNormalized * 2.6',
    flapRate: 0.03, flapAmp: 0.6, feedback: 0.48,
    gemR: 0.8, gemG: 0.9, gemB: 1.0,
    rimR: 0.45, rimG: 0.48, rimB: 0.50,
    bgR: 0.01, bgG: 0.015, bgB: 0.04,
    filR: 0.68, filG: 0.70, filB: 0.72,
    gammaR: 0.90, gammaG: 0.89, gammaB: 0.88,
    beatR: 0.04, beatG: 0.06, beatB: 0.1,
  },
  {
    name: 'golden-ratio',
    tags: 'gold, phi, spiral, clit-variation',
    desc: 'Golden Ratio — Phi-based multi-sine curl, balanced detail, slow organic drift',
    aLow: 1.55, aHigh: 1.85, aSine: 0.02, bBase: 0.50, bAudio: 0.12, bSine: 0.022,
    camX: 0.75, camY: -0.05, scale: 0.6,
    laceStyle: 'balanced', lacePow: 3.0,
    colorPhaseBase: 0.8, colorPhaseAudio: 'spectralKurtosisNormalized * 3.0',
    flapRate: 0.1, flapAmp: 0.35, feedback: 0.25,
    phiCurl: true,
    gemR: 1.0, gemG: 0.8, gemB: 0.35,
    rimR: 0.42, rimG: 0.40, rimB: 0.38,
    bgR: 0.03, bgG: 0.015, bgB: 0.005,
    filR: 0.65, filG: 0.62, filB: 0.60,
    gammaR: 0.90, gammaG: 0.91, gammaB: 0.92,
    beatR: 0.12, beatG: 0.06, beatB: 0.02,
  },
  {
    name: 'heartbeat',
    tags: 'heart, pulse, crimson, clit-variation',
    desc: 'Heartbeat — Bass-driven pulse, breathing zoom, strong beat flash',
    aLow: 1.35, aHigh: 1.65, aSine: 0.02, bBase: 0.55, bAudio: 0.12, bSine: 0.025,
    camX: 0.77, camY: 0.03, scale: 0.6,
    laceStyle: 'balanced', lacePow: 3.0,
    colorPhaseBase: -0.5, colorPhaseAudio: 'bassNormalized * 3.2',
    pulseStrength: 0.10,
    breathScale: true,
    flapRate: 0.25, flapAmp: 0.3, feedback: 0.3,
    gemR: 1.0, gemG: 0.25, gemB: 0.25,
    rimR: 0.48, rimG: 0.42, rimB: 0.45,
    bgR: 0.04, bgG: 0.005, bgB: 0.015,
    filR: 0.65, filG: 0.60, filB: 0.62,
    gammaR: 0.89, gammaG: 0.91, gammaB: 0.90,
    beatR: 0.15, beatG: 0.03, beatB: 0.02,
  },
  {
    name: 'midnight-garden',
    tags: 'garden, emerald, bioluminescent, clit-variation',
    desc: 'Midnight Garden — Soft y-dominant petals, gentle drift, medium trails',
    aLow: 1.45, aHigh: 1.8, aSine: 0.018, bBase: 0.52, bAudio: 0.10, bSine: 0.02,
    camX: 0.78, camY: -0.02, scale: 0.6,
    laceStyle: 'y-dom', lacePow: 2.0,
    colorPhaseBase: 1.6, colorPhaseAudio: 'midsNormalized * 3.0',
    flapRate: 0.1, flapAmp: 0.35, feedback: 0.35,
    gemR: 0.35, gemG: 0.95, gemB: 0.45,
    rimR: 0.42, rimG: 0.48, rimB: 0.44,
    bgR: 0.01, bgG: 0.025, bgB: 0.01,
    filR: 0.60, filG: 0.68, filB: 0.62,
    gammaR: 0.90, gammaG: 0.88, gammaB: 0.90,
    beatR: 0.04, beatG: 0.12, beatB: 0.04,
  },
  {
    name: 'molten-core',
    tags: 'lava, molten, volcanic, clit-variation',
    desc: 'Molten Core — Wide A morph range, dramatic shape-shifting, medium trails',
    aLow: 1.3, aHigh: 1.9, aSine: 0.025, bBase: 0.53, bAudio: 0.15, bSine: 0.03,
    camX: 0.77, camY: 0.0, scale: 0.6,
    laceStyle: 'balanced', lacePow: 3.0,
    colorPhaseBase: -0.8, colorPhaseAudio: 'energyNormalized * 3.5',
    flapRate: 0.18, flapAmp: 0.4, feedback: 0.32,
    gemR: 1.0, gemG: 0.5, gemB: 0.15,
    rimR: 0.50, rimG: 0.45, rimB: 0.42,
    bgR: 0.04, bgG: 0.008, bgB: 0.005,
    filR: 0.68, filG: 0.63, filB: 0.60,
    gammaR: 0.89, gammaG: 0.90, gammaB: 0.91,
    beatR: 0.15, beatG: 0.06, beatB: 0.02,
  },
  {
    name: 'morpho-wing',
    tags: 'butterfly, iridescent, morpho, clit-variation',
    desc: 'Morpho Wing — Fast flap, x-wing spread, time-rotating color + audio sweep',
    aLow: 1.5, aHigh: 1.85, aSine: 0.022, bBase: 0.50, bAudio: 0.12, bSine: 0.025,
    camX: 0.78, camY: 0.02, scale: 0.6,
    laceStyle: 'x-dom', lacePow: 2.5,
    colorPhaseBase: 0.0, colorPhaseAudio: 'spectralCentroidNormalized * 3.5 + iTime * 0.04',
    flapRate: 0.4, flapAmp: 0.55, feedback: 0.22,
    gemR: 0.4, gemG: 0.6, gemB: 1.0,
    rimR: 0.50, rimG: 0.52, rimB: 0.55,
    bgR: 0.015, bgG: 0.01, bgB: 0.05,
    filR: 0.65, filG: 0.67, filB: 0.70,
    gammaR: 0.90, gammaG: 0.89, gammaB: 0.88,
    beatR: 0.06, beatG: 0.06, beatB: 0.12,
  },
  {
    name: 'nebula-birth',
    tags: 'nebula, cosmic, space, clit-variation',
    desc: 'Nebula Birth — Slow wide drift, heavy trails, time-rotating color spiral',
    aLow: 1.25, aHigh: 1.7, aSine: 0.014, bBase: 0.57, bAudio: 0.10, bSine: 0.018,
    camX: 0.74, camY: 0.0, scale: 0.58,
    laceStyle: 'balanced', lacePow: 2.5,
    colorPhaseBase: 2.5, colorPhaseAudio: 'spectralSkewNormalized * 3.2 + iTime * 0.03',
    flapRate: 0.07, flapAmp: 0.45, feedback: 0.42,
    gemR: 0.7, gemG: 0.4, gemB: 1.0,
    rimR: 0.48, rimG: 0.45, rimB: 0.52,
    bgR: 0.01, bgG: 0.005, bgB: 0.03,
    filR: 0.62, filG: 0.58, filB: 0.68,
    gammaR: 0.90, gammaG: 0.91, gammaB: 0.89,
    beatR: 0.08, beatG: 0.04, beatB: 0.12,
  },
  {
    name: 'quantum-flux',
    tags: 'quantum, ethereal, flux, clit-variation',
    desc: 'Quantum Flux — Dense mesh detail, fast jitter, flux-driven color sweep',
    aLow: 1.6, aHigh: 2.15, aSine: 0.028, bBase: 0.47, bAudio: 0.13, bSine: 0.03,
    camX: 0.82, camY: 0.0, scale: 0.6,
    laceStyle: 'mesh', lacePow: 3.0,
    colorPhaseBase: 1.0, colorPhaseAudio: 'spectralFluxNormalized * 4.0',
    flapRate: 0.35, flapAmp: 0.25, feedback: 0.18,
    gemR: 0.6, gemG: 0.8, gemB: 1.0,
    rimR: 0.48, rimG: 0.50, rimB: 0.52,
    bgR: 0.01, bgG: 0.01, bgB: 0.04,
    filR: 0.65, filG: 0.68, filB: 0.70,
    gammaR: 0.90, gammaG: 0.89, gammaB: 0.88,
    beatR: 0.06, beatG: 0.08, beatB: 0.12,
  },
  {
    name: 'shadow-puppet',
    tags: 'shadow, puppet, wayang, clit-variation',
    desc: 'Shadow Puppet — Inverted: dark lace silhouette on warm lit background',
    aLow: 1.4, aHigh: 1.75, aSine: 0.02, bBase: 0.55, bAudio: 0.10, bSine: 0.022,
    camX: 0.77, camY: 0.0, scale: 0.6,
    laceStyle: 'balanced', lacePow: 4.0,
    colorPhaseBase: 0.6, colorPhaseAudio: 'trebleNormalized * 2.8',
    inverted: true,
    flapRate: 0.12, flapAmp: 0.3, feedback: 0.15,
    gemR: 1.0, gemG: 0.7, gemB: 0.3,
    rimR: 0.42, rimG: 0.40, rimB: 0.38,
    bgR: 0.06, bgG: 0.04, bgB: 0.02,
    filR: 0.25, filG: 0.22, filB: 0.20,
    gammaR: 0.89, gammaG: 0.90, gammaB: 0.91,
    beatR: 0.1, beatG: 0.06, beatB: 0.02,
  },
  {
    name: 'silk-veil',
    tags: 'silk, veil, gentle, clit-variation',
    desc: 'Silk Veil — Soft low-power lace, heavy feedback ghosting, gentle motion',
    aLow: 1.35, aHigh: 1.65, aSine: 0.016, bBase: 0.56, bAudio: 0.08, bSine: 0.02,
    camX: 0.77, camY: 0.02, scale: 0.6,
    laceStyle: 'balanced', lacePow: 1.8,
    colorPhaseBase: -0.2, colorPhaseAudio: 'spectralRolloffNormalized * 2.8',
    flapRate: 0.08, flapAmp: 0.3, feedback: 0.5,
    gemR: 0.9, gemG: 0.5, gemB: 0.65,
    rimR: 0.48, rimG: 0.44, rimB: 0.50,
    bgR: 0.03, bgG: 0.01, bgB: 0.04,
    filR: 0.68, filG: 0.62, filB: 0.66,
    gammaR: 0.90, gammaG: 0.91, gammaB: 0.90,
    beatR: 0.1, beatG: 0.04, beatB: 0.06,
  },
  {
    name: 'smoke-ritual',
    tags: 'smoke, incense, ritual, clit-variation',
    desc: 'Smoke Ritual — Upward drift, heavy trails, time-rotating color + entropy sweep',
    aLow: 1.3, aHigh: 1.7, aSine: 0.015, bBase: 0.54, bAudio: 0.10, bSine: 0.02,
    camX: 0.76, camY: 0.0, scale: 0.6,
    laceStyle: 'y-dom', lacePow: 2.5,
    colorPhaseBase: 0.3, colorPhaseAudio: 'spectralEntropyNormalized * 3.0 + iTime * 0.02',
    flowYOffset: -0.0006,
    flapRate: 0.06, flapAmp: 0.4, feedback: 0.45,
    gemR: 0.9, gemG: 0.6, gemB: 0.3,
    rimR: 0.48, rimG: 0.45, rimB: 0.50,
    bgR: 0.02, bgG: 0.01, bgB: 0.03,
    filR: 0.62, filG: 0.58, filB: 0.65,
    gammaR: 0.90, gammaG: 0.91, gammaB: 0.92,
    beatR: 0.1, beatG: 0.05, beatB: 0.04,
  },
  {
    name: 'tidal-pool',
    tags: 'tidal, pool, water, clit-variation',
    desc: 'Tidal Pool — Lateral drift, balanced detail, crest-driven color cycling',
    aLow: 1.4, aHigh: 1.8, aSine: 0.02, bBase: 0.54, bAudio: 0.12, bSine: 0.025,
    camX: 0.76, camY: -0.03, scale: 0.6,
    laceStyle: 'balanced', lacePow: 2.8,
    colorPhaseBase: 3.5, colorPhaseAudio: 'spectralCrestNormalized * 2.8',
    flowXOffset: 0.0004,
    flapRate: 0.12, flapAmp: 0.35, feedback: 0.33,
    gemR: 0.35, gemG: 0.9, gemB: 0.85,
    rimR: 0.45, rimG: 0.50, rimB: 0.52,
    bgR: 0.01, bgG: 0.02, bgB: 0.04,
    filR: 0.62, filG: 0.68, filB: 0.66,
    gammaR: 0.90, gammaG: 0.89, gammaB: 0.89,
    beatR: 0.04, beatG: 0.08, beatB: 0.1,
  },
  {
    name: 'witch-flame',
    tags: 'witch, flame, supernatural, clit-variation',
    desc: 'Witch Flame — Upward flame drift, y-dominant tendrils, roughness-swept color',
    aLow: 1.45, aHigh: 1.85, aSine: 0.022, bBase: 0.52, bAudio: 0.12, bSine: 0.025,
    camX: 0.78, camY: 0.0, scale: 0.6,
    laceStyle: 'y-dom', lacePow: 3.0,
    colorPhaseBase: 5.0, colorPhaseAudio: 'spectralRoughnessNormalized * 3.2',
    flowYOffset: -0.0008,
    flapRate: 0.2, flapAmp: 0.35, feedback: 0.28,
    gemR: 0.4, gemG: 1.0, gemB: 0.5,
    rimR: 0.48, rimG: 0.52, rimB: 0.48,
    bgR: 0.01, bgG: 0.015, bgB: 0.02,
    filR: 0.62, filG: 0.68, filB: 0.62,
    gammaR: 0.90, gammaG: 0.89, gammaB: 0.90,
    beatR: 0.04, beatG: 0.12, beatB: 0.05,
  },
  {
    name: 'aurora',
    tags: 'aurora, northern-lights, curtain, clit-variation',
    desc: 'Aurora — Wide curtain spread, y-dominant vertical lace, slow glacial drift',
    aLow: 1.3, aHigh: 1.9, aSine: 0.012, bBase: 0.55, bAudio: 0.10, bSine: 0.018,
    camX: 0.74, camY: 0.0, scale: 0.58,
    laceStyle: 'y-dom', lacePow: 2.0,
    colorPhaseBase: 1.0, colorPhaseAudio: 'spectralCentroidNormalized * 3.5 + iTime * 0.025',
    flapRate: 0.05, flapAmp: 0.5, feedback: 0.42,
    gemR: 0.5, gemG: 0.9, gemB: 0.7,
    rimR: 0.48, rimG: 0.52, rimB: 0.50,
    bgR: 0.008, bgG: 0.015, bgB: 0.03,
    filR: 0.62, filG: 0.68, filB: 0.65,
    gammaR: 0.90, gammaG: 0.89, gammaB: 0.88,
    beatR: 0.04, beatG: 0.10, beatB: 0.08,
  },
  {
    name: 'breathing-tides',
    tags: 'ocean, tidal, breathing, clit-variation',
    desc: 'Breathing Tides — Slow zoom breathing, high B smoothness, heavy persistent trails',
    aLow: 1.4, aHigh: 1.7, aSine: 0.016, bBase: 0.60, bAudio: 0.08, bSine: 0.02,
    camX: 0.76, camY: 0.02, scale: 0.6,
    laceStyle: 'balanced', lacePow: 2.5,
    colorPhaseBase: 2.0, colorPhaseAudio: 'bassNormalized * 3.0',
    breathScale: true,
    flapRate: 0.06, flapAmp: 0.4, feedback: 0.48,
    gemR: 0.4, gemG: 0.7, gemB: 1.0,
    rimR: 0.45, rimG: 0.48, rimB: 0.52,
    bgR: 0.01, bgG: 0.015, bgB: 0.04,
    filR: 0.60, filG: 0.65, filB: 0.68,
    gammaR: 0.89, gammaG: 0.90, gammaB: 0.91,
    beatR: 0.04, beatG: 0.06, beatB: 0.10,
  },
]

function generateShader(v) {
  // Helper: ensure all numbers become proper GLSL float literals with fixed precision
  const f = (n) => {
    const fixed = Number(n).toFixed(4)
    // Trim trailing zeros but keep at least one decimal place
    return fixed.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '.0')
  }

  const laceExpr = v.laceStyle === 'x-dom' ? 'max(lace_x, lace_y * 0.35)'
    : v.laceStyle === 'y-dom' ? 'max(lace_x * 0.4, lace_y)'
    : v.laceStyle === 'mesh' ? 'max(lace_x * 0.8, lace_y * 0.8)'
    : 'max(lace_x, lace_y)'

  const laceLo = v.laceLoOverride || -2.0
  const laceHi = v.laceHiOverride || -5.0

  const flowYExtra = v.flowYOffset ? ` + ${f(v.flowYOffset)}` : ''
  const flowXExtra = v.flowXOffset ? ` + ${f(v.flowXOffset)}` : ''

  const pulseStr = v.pulseStrength || 0.06
  const rimIBase = v.rimIntensityBase || 0.4
  const rimIAudio = v.rimIntensityAudio || 0.5

  const breathLine = v.breathScale
    ? `#define BREATH_SCALE (0.6 + 0.015 * sin(iTime * 0.5) + bassNormalized * 0.02)`
    : ''
  const scaleVal = v.breathScale ? 'BREATH_SCALE' : f(v.scale)

  // A uses slope*rSquared for smooth long-term trend, zScore for fine jitter, sine for organic drift
  const aSineFreq = (v.aSine * 1000 % 30 / 1000 + 0.015)
  // B uses energySlope*rSquared for smooth trend, zScore for fine jitter
  const bSineFreq = (v.bSine * 900 % 30 / 1000 + 0.018)

  const curlDef = v.phiCurl
    ? `#define TENDRIL_CURL (sin(iTime * 0.1) * 0.3 + sin(iTime * 0.1618) * 0.2 + sin(iTime * 0.2618) * 0.12 + spectralCentroidSlope * spectralCentroidRSquared * 0.8 + spectralCentroidZScore * 0.05)
#define TENDRIL_CROSS (sin(iTime * 0.077) * 0.25 + sin(iTime * 0.1247) * 0.15 + sin(iTime * 0.2017) * 0.1 + spectralSpreadSlope * spectralSpreadRSquared * 0.6 + spectralSpreadZScore * 0.04)`
    : `#define TENDRIL_CURL (sin(iTime * FLAP_RATE) * FLAP_AMP + sin(iTime * FLAP_RATE * 0.57) * FLAP_AMP * 0.5 + spectralCentroidSlope * spectralCentroidRSquared * 0.8 + spectralCentroidZScore * 0.05)
#define TENDRIL_CROSS (sin(iTime * FLAP_RATE * 0.77) * FLAP_AMP * 0.7 + sin(iTime * FLAP_RATE * 0.43 + 1.0) * FLAP_AMP * 0.4 + spectralSpreadSlope * spectralSpreadRSquared * 0.6 + spectralSpreadZScore * 0.04)`

  // Shadow puppet inverts: dark lace silhouette on warm lit background
  const colorBlock = v.inverted
    ? `    // Inverted: warm glow background, dark lace silhouette
    vec3 bg_glow = vec3(${f(v.bgR)}, ${f(v.bgG)}, ${f(v.bgB)}) + sexy_col * 0.15;
    vec3 col = mix(bg_glow, vec3(0.02, 0.01, 0.01), lace * 0.7);
    // But keep rainbow visible in the lace edges
    col = mix(col, sexy_col * 0.4, lace_fine * 0.5);
    col += vec3(${f(v.filR)}, ${f(v.filG)}, ${f(v.filB)}) * lace_fine * 0.15;`
    : `    vec3 bg = vec3(${f(v.bgR)}, ${f(v.bgG)}, ${f(v.bgB)});
    vec3 col = mix(bg, sexy_col, lace);
    col += vec3(${f(v.filR)}, ${f(v.filG)}, ${f(v.filB)}) * lace_fine * 0.25;`

  // A: slope*rSquared for smooth trend (confident direction), zScore for fine jitter, sine for organic drift
  // The slope gives long-term direction, rSquared gates it so only confident trends affect the fractal
  const aRange = v.aHigh - v.aLow
  const aMid = (v.aHigh + v.aLow) / 2
  const aDefine = `#define A (${f(aMid)} + spectralCentroidSlope * spectralCentroidRSquared * ${f(aRange * 0.8)} + spectralCentroidZScore * ${f(aRange * 0.15)} + ${f(v.aSine)} * sin(iTime * ${f(aSineFreq)}))`
  // B: energySlope*rSquared for smooth trend, energyZScore for fine jitter
  const bDefine = `#define B (${f(v.bBase)} + energySlope * energyRSquared * ${f(v.bAudio * 2.5)} + energyZScore * ${f(v.bAudio * 0.3)} + ${f(v.bSine)} * sin(iTime * ${f(bSineFreq)}))`

  return `// @fullscreen: true
// @mobile: true
// @tags: ${v.tags}
// ${v.desc}

${aDefine}
${bDefine}
#define DROP_INTENSITY clamp(-energySlope * energyRSquared * 15.0, 0.0, 1.0)
#define BUILD_INTENSITY clamp(energySlope * energyRSquared * 10.0, 0.0, 1.0)
#define PULSE (1.0 + bassZScore * ${f(pulseStr)})
#define FEEDBACK_MIX (${f(v.feedback)} + energyNormalized * 0.1)
#define RIM_INTENSITY (${f(rimIBase)} + trebleNormalized * ${f(rimIAudio)})
#define GEM_BRILLIANCE (0.8 + spectralCrestNormalized * 0.5)
#define GEM_DISPERSION (0.3 + spectralSpreadNormalized * 0.4)
#define FLAP_RATE ${f(v.flapRate)}
#define FLAP_AMP ${f(v.flapAmp)}
${curlDef}
#define FLOW_X (spectralCentroidSlope * 0.003${flowXExtra})
#define FLOW_Y (spectralSpreadSlope * 0.002${flowYExtra})
#define ZSCORE_TURBULENCE (abs(bassZScore) + abs(trebleZScore) + abs(spectralCentroidZScore) + abs(spectralFluxZScore) + abs(spectralEntropyZScore))
#define ZSCORE_CALM mix(1.0, 0.0, clamp(ZSCORE_TURBULENCE / 3.0, 0.0, 1.0))
#define SLOPE_CALM mix(1.0, 0.0, clamp((abs(energySlope) + abs(bassSlope) + abs(spectralFluxSlope)) * 5.0, 0.0, 1.0))
#define TREND_CALM mix(1.0, 0.0, clamp((energyRSquared + bassRSquared + spectralFluxRSquared) / 1.5, 0.0, 1.0))
#define AUDIO_SETTLED (ZSCORE_CALM * SLOPE_CALM * TREND_CALM)
#define DROP_RAMP 0.08
#define DROP_DECAY_MIN 0.01
#define DROP_DECAY_MAX 0.06
${breathLine}

void mainImage(out vec4 P, vec2 V) {
    vec2 Z = iResolution.xy,
         C = ${scaleVal} * (Z - V - V).yx / Z.y;
    C.x += ${f(v.camX)};
    C.y += ${f(v.camY)};
    V = C + vec2(TENDRIL_CURL * 0.02, TENDRIL_CROSS * 0.015);
    float v, x, y, z = y = x = 9.;
    float focal_trap = 9.0;
    vec2 focal_center = vec2(0.0, 0.12);
    for (int k = 0; k < 50; k++) {
        float a = atan(V.y, V.x), d = dot(V, V) * A;
        float c = dot(V, vec2(a, log(max(d, 1e-10)) / 2.));
        V = exp(-a * V.y) * pow(max(d, 1e-10), V.x / 2.) * vec2(cos(c), sin(c));
        V = vec2(V.x * V.x - V.y * V.y, dot(V, V.yx));
        V -= C * B;
        x = min(x, abs(V.x)); y = min(y, abs(V.y));
        z > (v = dot(V, V)) ? z = v, Z = V : Z;
        focal_trap = min(focal_trap, length(V - focal_center));
    }
    z = 1. - smoothstep(1., -6., log(max(y, 1e-10))) * smoothstep(1., -6., log(max(x, 1e-10)));
    float lace_x = smoothstep(${f(laceLo)}, ${f(laceHi)}, log(max(x, 1e-10)));
    float lace_y = smoothstep(${f(laceLo)}, ${f(laceHi)}, log(max(y, 1e-10)));
    float lace = ${laceExpr};
    float lace_fine = lace_x * lace_y;
    lace = pow(max(lace, 0.0), ${f(v.lacePow)});
    // Rainbow with audio-driven color phase
    float color_phase = ${f(v.colorPhaseBase)} + ${v.colorPhaseAudio};
    vec4 rainbow = sqrt(max(z + (z - z * z * z) * cos(atan(Z.y, Z.x) - vec4(0.0, 2.1, 4.2, 0.0) + color_phase), vec4(0.0)));
    float luma = dot(rainbow.rgb, vec3(0.299, 0.587, 0.114));
    float focal_glow = smoothstep(0.5, 0.01, focal_trap);
    focal_glow = pow(max(focal_glow, 0.0), 2.0);
    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;
    float focal = focal_glow;
    float focal_inner = smoothstep(0.35, 0.02, focal_trap);
    float gem_rim = max(focal - pow(max(focal_inner, 0.0), 1.5), 0.0);
    gem_rim = pow(gem_rim, 0.6) * 2.5;
    float gem_detail = smoothstep(0.3, 0.8, z) * focal;
    float gem_sparkle = pow(gem_detail, 3.0);
    float gem_pulse = 0.85 + 0.15 * sin(iTime * 0.7);
    float disp = GEM_DISPERSION;
    float f_safe = max(focal, 0.0);
    vec3 gem_prism = vec3(pow(f_safe, 1.8 - disp * 0.3), pow(f_safe, 2.0), pow(f_safe, 1.8 + disp * 0.3));
    float gem_depth_shade = mix(0.4, 1.0, smoothstep(0.0, 0.7, gem_rim + gem_sparkle * 0.3));
    float base_depth = mix(0.6, 0.95, 1.0 - luma);
    float detail_depth = mix(0.2, 0.5, luma);
    float edge = abs(dFdx(z)) + abs(dFdy(z));
    base_depth = mix(base_depth, detail_depth, smoothstep(0.0, 0.5, edge * 30.0) * 0.6);
    float depth = mix(base_depth, 0.0, pow(max(focal, 0.0), 1.5));
    float drop_signal = clamp(DROP_INTENSITY * smoothstep(2.0, 4.0, ZSCORE_TURBULENCE), 0.0, 1.0);
    vec2 state_uv = gl_FragCoord.xy / iResolution.xy;
    float drop_state = getLastFrameColor(state_uv).a;
    drop_state = mix(drop_state, 1.0, drop_signal * DROP_RAMP);
    drop_state = mix(drop_state, 0.0, mix(DROP_DECAY_MIN, DROP_DECAY_MAX, AUDIO_SETTLED));
    drop_state = clamp(drop_state, 0.0, 1.0);
    float drop = animateEaseInOutCubic(drop_state);
    depth = mix(depth, depth * 0.7, BUILD_INTENSITY * 0.3);
    depth = mix(depth, depth * 1.3, drop * (1.0 - focal));
    depth = mix(depth, 0.0, drop * focal);
    depth = clamp(depth, 0.0, 1.0);
    vec3 sexy_col = rainbow.rgb;
${colorBlock}
    float rim = abs(dFdx(z)) + abs(dFdy(z));
    rim = smoothstep(0.1, 0.5, rim * 20.0);
    rim *= smoothstep(0.0, 0.15, abs(C.y));
    col += vec3(${f(v.rimR)}, ${f(v.rimG)}, ${f(v.rimB)}) * rim * RIM_INTENSITY * 0.3;
    float glow_energy = clamp(energyNormalized + energyZScore * 0.3, 0.0, 1.0);
    vec3 gem_base = vec3(${f(v.gemR)}, ${f(v.gemG)}, ${f(v.gemB)});
    vec3 gem_fire = gem_base * 1.2;
    vec3 gem_white = vec3(1.0, 0.9, 0.95);
    vec3 gem_interior = gem_prism * gem_base * gem_pulse * gem_depth_shade;
    vec3 gem_specular = gem_white * gem_sparkle * mix(0.4, 0.9, glow_energy) * GEM_BRILLIANCE;
    vec3 gem_rim_col = mix(gem_base * 0.5, gem_base, smoothstep(0.0, 1.0, gem_rim));
    vec3 gem_col = gem_interior * GEM_BRILLIANCE * mix(0.7, 1.3, glow_energy) + gem_specular + gem_rim_col * gem_rim * GEM_BRILLIANCE;
    col = mix(col, gem_col, focal * 0.85);
    col += gem_base * smoothstep(0.8, 0.0, focal_trap) * (1.0 - focal) * mix(0.08, 0.25, glow_energy) * GEM_BRILLIANCE;
    col *= mix(mix(1.0, 0.2, drop), 1.0, focal);
    col += gem_base * 0.5 * rim * drop * 0.2;
    col += gem_fire * focal * mix(1.0, 2.5, drop) * drop * glow_energy * 0.5;
    col += gem_white * pow(f_safe, 2.5) * drop * glow_energy * 0.4;
    if (beat) { col += vec3(${f(v.beatR)}, ${f(v.beatG)}, ${f(v.beatB)}) * focal; col *= 1.05; }
    col *= PULSE;
    vec4 prev = getLastFrameColor(gl_FragCoord.xy / iResolution.xy + vec2(FLOW_X, FLOW_Y));
    col = mix(col, prev.rgb * 0.95, FEEDBACK_MIX);
    float vign = 1.0 - pow(length(uv) * 0.65, 1.8);
    vign = mix(vign, pow(max(vign, 0.0), 1.0 + drop * 2.0), drop);
    col *= max(vign, 0.02);
    col *= mix(0.15, 1.0, max(max(lace, rim * 0.5), max(focal, gem_rim * 0.7)));
    col = col / (col + vec3(0.7));
    col = pow(max(col, vec3(0.0)), vec3(${f(v.gammaR)}, ${f(v.gammaG)}, ${f(v.gammaB)}));
    P = vec4(col, drop_state);
}
`
}

const outDir = path.join(__dirname, '..', 'shaders', 'clit', 'variations')

for (const v of variations) {
  const code = generateShader(v)
  const outPath = path.join(outDir, `${v.name}.frag`)
  fs.writeFileSync(outPath, code)
  console.log(`Wrote ${v.name}.frag`)
}

console.log(`\nGenerated ${variations.length} shaders`)
