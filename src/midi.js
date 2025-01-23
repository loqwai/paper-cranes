'use strict'

// Track current values and type for each knob
const knobStates = {}
const relativeKnobs = new Set()
const BASE_SENSITIVITY = 0.01 // Base sensitivity that will be scaled by range

// Unified function to update knob value in URL
function updateKnobValue(knob, value) {
    const currentUrl = new URL(window.location)
    let current = parseFloat(currentUrl.searchParams.get(knob) ?? 0)
    // get the min and max value for the knob from knob_0.min and knob_0.max in the query params
    const min = parseFloat(currentUrl.searchParams.get(`${knob}.min`) ?? 0)
    const max = parseFloat(currentUrl.searchParams.get(`${knob}.max`) ?? 1)

    // Classify as relative if we see a 1 or 127
    if (value === 1 || value === 127) {
        relativeKnobs.add(knob)
    }

    if (relativeKnobs.has(knob)) {
        // For relative encoders
        if (!knobStates[knob]) knobStates[knob] = current

        // Scale sensitivity by the range of the knob
        const range = Math.abs(max - min)
        const scaledSensitivity = BASE_SENSITIVITY * range

        // Convert relative values: 1 for CW, 127 for CCW
        const delta = value === 1 ? scaledSensitivity : value === 127 ? -scaledSensitivity : 0
        knobStates[knob] = Math.max(min, Math.min(max, knobStates[knob] + delta))
        current = knobStates[knob]
    } else {
        // For absolute knobs (0-127 range)
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
                // Listen for Control Change messages (CC) from knobs
                if (command === 176) { // Channel 1 CC messages
                    let knobNumber = control
                    let knob = `knob_${knobNumber}`
                    updateKnobValue(knob, value)
                }
            }
        })
    })
    .catch((error) => {
        console.error('MIDI failed to start', error)
    })
