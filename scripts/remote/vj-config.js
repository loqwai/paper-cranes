// Fixed inputs for the guarded VJ loop (scripts/remote/vj-tick.js). Change numbers here, not in
// the rules, and keep scripts/remote/vj-rules.test.js passing.

// Shaders the loop may swap to. First entry = panic target. Every entry must be real show art
// (docs/vj-preferences.md: never put a test shader on the wall).
const KNOWN_GOOD = [
  { shader: 'clit-set/2', controller: 'clit-set', note: 'show default; techno phone-mic build' },
  { shader: 'clit-set/1', controller: 'clit-set', note: 'earlier clit-set fork, same controller' },
]

// Per-controller knob roles. Only `allowed` knobs may be nudged. `geometry` knobs move the camera
// or the fractal shape: the loop never touches them (no geometry oscillation).
const PROFILES = {
  'clit-set': {
    hue: 'knob_9', // HUE: palette turn
    react: 'knob_12', // REACT: audio size x1 (0) .. x2.5 (1)
    trails: 'knob_11', // TRAILS: frame feedback
    ember: 'knob_14', // EMBER: focal size
    allowed: ['knob_9', 'knob_10', 'knob_11', 'knob_12', 'knob_13', 'knob_14', 'knob_16'],
    geometry: ['knob_1', 'knob_2', 'knob_3', 'knob_4', 'knob_5', 'knob_6', 'knob_7', 'knob_8'],
    presenceKey: 'cs_presence',
    dropKey: 'cs_drop',
    needsWavelet: true,
  },
}

const LIMITS = {
  minChangeGapS: 60, // at most one change per minute (panic and undo are exempt)
  reloadGapS: 180, // at most one reload per 3 minutes, even with --force
  maxKnobStep: 0.1, // largest single knob move
  knobStep: 0.1, // the step the rules recommend
  reverseWindowS: 300, // a knob may not reverse direction within 5 minutes
  reactUpMax: 0.6, // rules never push REACT above this
  trailsUpMax: 0.5, // rules never push TRAILS above this
  flickerHard: 2.0, // one 30 s window at or above this = act
  flickerSoft: 0.7, // above this for `softTicks` ticks in a row = act
  softTicks: 2,
  clip: 0.02, // meter clip fraction
  black: 0.03, // meter lumMax over the window below this = black screen
  motionDead: 0.004, // meter motion below this = still picture
  energyAlive: 0.005, // energy above this = music is playing
  energyHot: 0.35, // energy above this with gain > 1 = input too hot
  dropZ: 0.5, // energyZScore above this = a drop: hold all tuning
  presenceLow: 0.3, // clit-set presence gate below this while music plays = input too quiet
  gainMin: 1,
  gainMax: 8,
  gainStep: 1.5, // multiply / divide per change
  meterSecs: 30,
}

// A fresh copy per display, so nothing is shared between people's loops. A display may override
// any part with <state dir>/<display>/config.json (same shape, merged one level deep).
export const defaultConfig = () => structuredClone({ knownGood: KNOWN_GOOD, profiles: PROFILES, limits: LIMITS })

export const mergeConfig = (base, over = {}) => ({
  knownGood: over.knownGood ?? base.knownGood,
  profiles: { ...base.profiles, ...over.profiles },
  limits: { ...base.limits, ...over.limits },
})
