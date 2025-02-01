'use strict'
const relativeKnobs = new Set()

const BASE_SENSITIVITY = 0.01 // Base sensitivity that will be scaled by range

const previousValues = {}
const relativeDecisionCounts = {}
const isRelativeEncoder = (value, previousValue) => {
    relativeDecisionCounts[value] = (relativeDecisionCounts[value] ?? 0)
    if((value === previousValue) && (value < 10 || value > 120)) {
        relativeDecisionCounts[value] = Math.min(relativeDecisionCounts[value] + 1, 10)
    } else {
        relativeDecisionCounts[value] = Math.max(relativeDecisionCounts[value] - 1, 0)
    }

    if (relativeDecisionCounts[value] > 5) {
        console.log('decided relative', value, relativeDecisionCounts[value])
        return true
    }
    return false
}
const getPreviousValue = (knob) => {
    return previousValues[knob] ?? 0
}



const setKnobValue = (knob, value) => {
    if (!window.cranes.updateFeature) return
    // Ensure value stays within min/max bounds
    const currentUrl = new URL(window.location)
    const min = parseFloat(currentUrl.searchParams.get(`${knob}.min`) ?? 0)
    const max = parseFloat(currentUrl.searchParams.get(`${knob}.max`) ?? 1)
    const clampedValue = Math.max(min, Math.min(max, value))
    window.cranes.updateFeature(knob, clampedValue)
}



function updateKnobValue(knob, value) {
    if (!window.cranes.updateFeature) return

    const currentUrl = new URL(window.location)
    const min = parseFloat(currentUrl.searchParams.get(`${knob}.min`) ?? 0)
    const max = parseFloat(currentUrl.searchParams.get(`${knob}.max`) ?? 1)
    const range = Math.abs(max - min)

    const previousValue = getPreviousValue(knob)

    // Store raw MIDI value for relative encoder detection
    previousValues[knob] = value

    // Improved relative encoder detection
    if (isRelativeEncoder(value, previousValue)) {
        console.log('noticed relative encoder', knob, value, previousValue)
        relativeKnobs.add(knob)
    }

    if (relativeKnobs.has(knob)) {
        // Get current actual value from the feature system
        const currentValue = window.cranes?.manualFeatures?.[knob] ?? min

        // Scale sensitivity by the range of the knob
        const scaledSensitivity = BASE_SENSITIVITY * range
        // is the value closer to 0 or 127?
        const delta = value < 64 ? scaledSensitivity : -scaledSensitivity

        if (value <= 63) { // Counter-clockwise
            const delta = (scaledSensitivity * value);
            return setKnobValue(knob, currentValue + delta)
        }
        if (value >= 65) { // Clockwise
            const delta = -(scaledSensitivity * (127 - value));
            console.log('clockwise', knob, value, delta)
            return setKnobValue(knob, currentValue + delta)
        }
        // Center position (64) - no change
        return

    }

    // Handle absolute knobs (standard 0-127 range)
    const scaledValue = (value / 127) * range + min
    return setKnobValue(knob, scaledValue)
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
