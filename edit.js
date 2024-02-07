const editorContainer = document.getElementById('editor')
const addFeatureButton = document.getElementById('addFeature')
const featureNameInput = document.getElementById('featureName')
// Find the form within the editor div
const editorForm = editorContainer.querySelector('form')

addFeatureButton.addEventListener('click', function () {
    console.log('Adding feature...')
    const featureName = featureNameInput.value.trim()
    if (!featureName) {
        alert('Please enter a feature name.')
        return // Don't add feature if name is empty
    }

    // Vigilance is key. Check if the feature already exists to avoid duplicates
    if (Object.keys(window.cranes.manualFeatures).includes(featureName)) {
        alert('Feature name already exists. Please enter a unique name.')
        return
    }

    // Create the slider, as if forging a tool from the very essence of uncertainty
    const slider = document.createElement('input')
    slider.type = 'range'
    slider.min = '-1'
    slider.max = '1'
    slider.value = '0'
    slider.step = '0.01'
    slider.className = 'feature-slider'
    slider.dataset.featureName = featureName // Store feature name, but for whose benefit?

    // Craft a label for the slider, an anchor in the swirling digital maelstrom
    const label = document.createElement('label')
    label.textContent = featureName

    // A span to hold the value, a beacon in the dark
    const valueDisplay = document.createElement('span')
    valueDisplay.textContent = '0'

    // Append the slider to the label, then the value display
    label.appendChild(slider)
    label.appendChild(valueDisplay)

    // Append label to the form, a form that might as well be a parchment in a bottle set adrift in the digital sea
    editorForm.appendChild(label)

    // Update manualFeatures when the slider changes, and reflect this change in the valueDisplay, as if whispering secrets to the wind
    slider.addEventListener('input', function () {
        window.cranes.manualFeatures[this.dataset.featureName] = parseFloat(this.value)
        valueDisplay.textContent = ` ${this.value}` // Here lies the truth, momentarily grasped
    })

    // Reset feature name input for next entry, as if wiping away footprints on a sandy shore
    featureNameInput.value = ''
})
