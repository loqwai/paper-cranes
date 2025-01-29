'use strict'

// Track current values and type for each knob
const knobStates = {}
const relativeKnobs = new Set()
const seenAbsoluteValues = new Set() // Track knobs that have shown absolute behavior
const BASE_SENSITIVITY = 0.01 // Base sensitivity that will be scaled by range

function updateKnobValue(knob, value) {
    if (!window.cranes.updateFeature) return
    const currentUrl = new URL(window.location)
    let current = parseFloat(currentUrl.searchParams.get(knob) ?? 0)
    const min = parseFloat(currentUrl.searchParams.get(`${knob}.min`) ?? 0)
    const max = parseFloat(currentUrl.searchParams.get(`${knob}.max`) ?? 1)

    // If we see any value besides 1 or 127, it's definitely an absolute knob
    if (value !== 1 && value !== 127) {
        seenAbsoluteValues.add(knob)
        relativeKnobs.delete(knob)
    }

    if (!seenAbsoluteValues.has(knob)) {
        relativeKnobs.add(knob)
    }

    if (!relativeKnobs.has(knob)) {
        // For absolute knobs (0-127 range)
        current = (value / 127) * (max - min) + min
        knobStates[knob] = current
        if (!window.cranes.updateFeature) return
        window.cranes.updateFeature(knob, current)
        return
    }

    // For relative encoders
    if (!knobStates[knob]) knobStates[knob] = current

    // Scale sensitivity by the range of the knob
    const range = Math.abs(max - min)
    const scaledSensitivity = BASE_SENSITIVITY * range

    // Convert relative values: 1 for CW, 127 for CCW
    const delta = value === 1 ? scaledSensitivity : value === 127 ? -scaledSensitivity : 0
    knobStates[knob] = Math.max(min, Math.min(max, knobStates[knob] + delta))
    current = knobStates[knob]

    window.cranes.updateFeature(knob, current)
}

// MIDI Access request
navigator
    .requestMIDIAccess()
    .then((midiAccess) => {
        midiAccess.inputs.forEach((input) => {
            input.onmidimessage = (message) => {
                const [command, control, value] = message.data
                if (command !== 176) return // Only handle Channel 1 CC messages
                updateKnobValue(`knob_${control}`, value)
            }
        })
    })
    .catch((error) => {
        console.error('MIDI failed to start', error)
    })
