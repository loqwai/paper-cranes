/**
 * What the visualizer knows about its own query params.
 *
 * The panel uses this for two things:
 *  1. Which control to render — a texture is a picker, not a text box.
 *  2. Whether an edit can be applied live, or needs a navigation.
 *
 * Anything not listed here still works; it falls through to a free-form
 * key/value row under "Other", which is the escape hatch that replaces
 * hand-editing the address bar.
 */

/** Merged into `window.cranes.manualFeatures` — visible on the very next frame. */
export const LIVE = 'live'

/** Rebuilds the shader program or the audio graph — needs a navigation. */
export const RELOAD = 'reload'

export const PARAM_SCHEMA = {
    shader: { control: 'shader', apply: RELOAD, label: 'Shader' },
    image: { control: 'image', apply: RELOAD, label: 'Texture' },
    // Repeated `?controller=` is a left-fold pipeline (src/controllerChain.js),
    // so order is load-bearing and this can't collapse to a single value.
    controller: { control: 'chain', apply: RELOAD, label: 'Controllers', repeatable: true },

    fullscreen: { control: 'toggle', apply: RELOAD, label: 'Fullscreen' },
    noaudio: { control: 'toggle', apply: RELOAD, label: 'No audio' },
    wavelet: { control: 'toggle', apply: RELOAD, label: 'Wavelet analysis' },
    midi: { control: 'toggle', apply: RELOAD, label: 'MIDI' },

    audio: { control: 'select', apply: RELOAD, label: 'Audio source', options: ['', 'tab'] },
    audio_file: { control: 'text', apply: RELOAD, label: 'Audio file' },
    audio_time: { control: 'text', apply: RELOAD, label: 'Audio start (s)' },

    // AudioProcessor takes fftSize in its constructor only, so this one can't be live.
    fft_size: {
        control: 'select',
        apply: RELOAD,
        label: 'FFT size',
        // '' is the unset state — without it the <select> renders blank when
        // the URL doesn't pin a size.
        options: ['', 1024, 2048, 4096, 8192, 16384],
        numeric: true,
        default: 4096,
    },

    // These two are re-read from manualFeatures every frame
    // (AudioProcessor.js:87 and :132), so they genuinely are live.
    smoothing: { control: 'range', apply: LIVE, label: 'Smoothing', min: 0.01, max: 0.5, step: 0.01, default: 0.1 },
    history_size: { control: 'range', apply: LIVE, label: 'History', min: 50, max: 2000, step: 50, default: 500 },

    time: { control: 'text', apply: LIVE, label: 'Frozen time' },
}

/**
 * Params the panel deliberately leaves alone: they belong to a session the
 * performer is already inside, and editing them from here would drop the
 * display connection or bounce out of an embed.
 */
export const UNTOUCHABLE = new Set(['remote', 'room', 'embed'])

/** Order the Settings section so the things reached for most sit at the top. */
export const SETTINGS_ORDER = [
    'shader',
    'image',
    'controller',
    'fullscreen',
    'audio',
    'audio_file',
    'audio_time',
    'noaudio',
    'wavelet',
    'midi',
    'fft_size',
    'smoothing',
    'history_size',
    'time',
]

/** True when a param is a knob value (`knob_7`) rather than its range metadata. */
export const isKnobValue = (key) => /^knob_\d+$/.test(key)

/** True for the `.min` / `.max` sidecars — the panel folds these into the knob row. */
export const isKnobRange = (key) => /^knob_\d+\.(min|max)$/.test(key)

/**
 * Which knobs a shader actually declares.
 *
 * Same regex `shader-wrapper.js` uses to decide which knob uniforms to inject,
 * so the panel shows the six knobs `plasma` really uses instead of all 200.
 */
export const knobsUsedBy = (shaderSource) => {
    if (!shaderSource) return []
    const used = new Set(
        [...shaderSource.matchAll(/uniform\s+float\s+knob_(\d+)/g)].map((m) => parseInt(m[1]))
    )
    // A shader can also reference a knob the wrapper injected for it, without
    // declaring the uniform itself — catch those too.
    for (const m of shaderSource.matchAll(/\bknob_(\d+)\b/g)) used.add(parseInt(m[1]))
    return [...used].sort((a, b) => a - b)
}
