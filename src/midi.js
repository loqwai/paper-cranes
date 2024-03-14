'use strict'

// Unified function to update knob value in URL
function updateKnobValue(knob, value) {
    const currentUrl = new URL(window.location)
    let current = parseFloat(currentUrl.searchParams.get(knob) ?? 0)
    // get the min and max value for the knob from knob_0.min and knob_0.max in the query params
    const min = parseFloat(currentUrl.searchParams.get(`${knob}.min`) ?? 0)
    const max = parseFloat(currentUrl.searchParams.get(`${knob}.max`) ?? 1)
    // the incoming knob value is between 0 and 127, so we need to scale it to the min and max values
    if(!window.cranes.updateFeature) return;
    current = (value / 127) * (max - min) + min
    window.cranes.updateFeature(knob, current)
}

// MIDI Access request
navigator
    .requestMIDIAccess()
    .then((midiAccess) => {
        console.log('MIDI ready')
        midiAccess.inputs.forEach((input) => {
            input.onmidimessage = (message) => {
                const [command, control, value] = message.data
                // Listen for Control Change messages from knobs
                if (command === 176) {
                    let knobNumber = control - 70 // Assuming control 71 is knob_1
                    let knob = `knob_${knobNumber}`
                    updateKnobValue(knob, value)
                }
            }
        })
    })
    .catch((error) => {
        console.error('MIDI failed to start', error)
    })
