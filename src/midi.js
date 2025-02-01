'use strict'

// Track current values and type for each knob
const knobStates = {}
const relativeKnobs = new Set()
const seenAbsoluteValues = new Set() // Track knobs that have shown absolute behavior
const BASE_SENSITIVITY = 0.1 // Base sensitivity that will be scaled by range

function updateKnobValue(knob, value) {
    if (!window.cranes.updateFeature) return
    const currentUrl = new URL(window.location)
    let current = parseFloat(currentUrl.searchParams.get(knob) ?? 0)
    const min = parseFloat(currentUrl.searchParams.get(`${knob}.min`) ?? 0)
    const max = parseFloat(currentUrl.searchParams.get(`${knob}.max`) ?? 1)

    // For Ableton Push 1, values 1-63 are clockwise, 65-127 are counter-clockwise
    // Value 64 is no movement
    const isRelativeEncoder = value === 1 || value === 127 || (value >= 1 && value <= 127)

    if (!knobStates[knob]) {
        knobStates[knob] = current
    }

    if (isRelativeEncoder) {
        relativeKnobs.add(knob)
        // Scale sensitivity by the range of the knob
        const range = Math.abs(max - min)
        const scaledSensitivity = BASE_SENSITIVITY * range

        let delta = 0
        if (value <= 63) { // Clockwise
            delta = value * (scaledSensitivity / 63)
        } else if (value >= 65) { // Counter-clockwise
            delta = (value - 128) * (scaledSensitivity / 63)
        }
        // Value 64 results in no movement (delta = 0)

        knobStates[knob] = Math.max(min, Math.min(max, knobStates[knob] + delta))
        current = knobStates[knob]
    } else {
        // Handle absolute knobs (standard 0-127 range)
        seenAbsoluteValues.add(knob)
        relativeKnobs.delete(knob)
        current = (value / 127) * (max - min) + min
        knobStates[knob] = current
    }

    if (!window.cranes.updateFeature) return
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
