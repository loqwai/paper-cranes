document.addEventListener('DOMContentLoaded', (event) => {
    const editorContainer = document.getElementById('editor')
    const addFeatureButton = document.getElementById('addFeature')
    const featureNameInput = document.getElementById('featureName')
    // Find the form within the editor div
    const editorForm = editorContainer.querySelector('form')

    addFeatureButton.addEventListener('click', function () {
        const featureName = featureNameInput.value.trim()
        if (!featureName) {
            alert('Please enter a feature name.')
            return // Don't add feature if name is empty
        }

        // Check if the feature already exists to avoid duplicates
        if (Object.keys(window.cranes.manualFeatures).includes(featureName)) {
            alert('Feature name already exists. Please enter a unique name.')
            return
        }

        // Create the slider
        const slider = document.createElement('input')
        slider.type = 'range'
        slider.min = '-1'
        slider.max = '1'
        slider.value = '0'
        slider.className = 'feature-slider'
        slider.dataset.featureName = featureName // Store feature name

        // Create a label for the slider
        const label = document.createElement('label')
        label.textContent = featureName + ': '
        label.appendChild(slider)

        // Append label to the form
        editorForm.appendChild(label)
        editorForm.appendChild(document.createElement('br')) // For better spacing

        // Update manualFeatures when the slider changes
        slider.addEventListener('input', function () {
            window.cranes.manualFeatures[this.dataset.featureName] = parseFloat(this.value)
        })

        // Reset feature name input for next entry
        featureNameInput.value = ''
    })
})
