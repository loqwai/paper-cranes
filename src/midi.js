'use strict'
const relativeKnobs = new Set()

const BASE_SENSITIVITY = 0.01 // Base sensitivity that will be scaled by range

const absoluteKnobs = new Set();

const isAbsoluteEncoder = (value) => {
    console.log('isAbsoluteEncoder', value)
    if (value >= 30 || value <= 100) absoluteKnobs.add(value)
    if(absoluteKnobs.has(value)) return true
    return false
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
    const currentUrl = new URL(window.location)
    const min = parseFloat(currentUrl.searchParams.get(`${knob}.min`) ?? 0)
    const max = parseFloat(currentUrl.searchParams.get(`${knob}.max`) ?? 1)
    const range = Math.abs(max - min)
    console.log('updateKnobValue', knob, value, min, max, range)
    const scaledValue = (value / 127) * range + min

    if(isAbsoluteEncoder(value)) return setKnobValue(knob, scaledValue)


    // Get current actual value from the feature system
    const currentValue = window.cranes?.manualFeatures?.[knob] ?? min

    // Scale sensitivity by the range of the knob
    const scaledSensitivity = BASE_SENSITIVITY * range
    // is the value closer to 0 or 127?

    if (value <= 63) { // Counter-clockwise
        const delta = (scaledSensitivity * value);
        return setKnobValue(knob, currentValue + delta)
    }
    if (value >= 65) { // Clockwise
        const delta = -(scaledSensitivity * (128 - value));
        console.log('clockwise', knob, value, delta)
        return setKnobValue(knob, currentValue + delta)
    }
    // Center position (64) - no change
    return
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
