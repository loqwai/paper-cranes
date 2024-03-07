// ==UserScript==
// @name        midi to paper cranes
// @namespace   beadfamous
// @match       http://localhost:6969/
// @grant       none
// @version     1.0
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // Unified function to update knob value in URL
    function updateKnobValue(knob, value) {
        const currentUrl = new URL(window.location);
        let current = parseFloat(currentUrl.searchParams.get(knob) || 0);
        console.log({current});

        if (value > 1) {
            current += 0.01;
        } else {
            current -= 0.01;
        }

        currentUrl.searchParams.set(knob, current.toFixed(2));
        window.history.pushState({}, '', currentUrl.toString());
        console.log(`Updated ${knob}: ${current.toFixed(2)}`);
    }

    // MIDI Access request
    navigator.requestMIDIAccess().then(midiAccess => {
        console.log("MIDI ready");
        midiAccess.inputs.forEach((input) => {
            input.onmidimessage = (message) => {
                const [command, control, value] = message.data;
                // Listen for Control Change messages from knobs
                if (command === 176) {
                    let knobNumber = control - 70; // Assuming control 71 is knob_1
                    let knob = `knob_${knobNumber}`;
                    updateKnobValue(knob, value);
                }
            };
        });
    }).catch((error) => {
        console.error("MIDI failed to start", error);
    });
})();
