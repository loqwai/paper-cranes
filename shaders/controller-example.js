/**
 * Example shader controller
 *
 * This file demonstrates how to create a controller for a shader.
 * The controller exports a makeRender function that returns a render function
 * which gets called on each frame before the shader renders.
 */

/**
 * Initialize the controller and return a render function
 * @param {Object} cranes - The global cranes object with all app state
 * @returns {Function} - The render function that will be called each frame
 */
export function makeRender(cranes) {
  console.log('Controller initialized with:', cranes)

  // Initialize persistent state for this controller
  const state = {
    rotation: 0,
    pulse: 0,
    colorShift: 0,
    frameCount: 0
  }

  /**
   * Render function called each frame
   * @param {Object} cranes - The global cranes object with current app state
   * @returns {Object} - Values to merge into the global cranes object
   */
  return function render(cranes) {
    // Get audio features from cranes object
    const {
      measuredAudioFeatures: features = {},
      manualFeatures = {}
    } = cranes

    const time = performance.now() / 1000

    // Update animation values
    state.rotation += 0.01 * (1 + (features.bassNormalized || 0) * 2)
    state.pulse = Math.sin(time * 2) * 0.5 + 0.5
    state.colorShift += 0.005 * (1 + (features.spectralFluxNormalized || 0))
    state.frameCount++

    // Create custom uniforms to be added to the global cranes object
    return {
      manualFeatures: {
        // Animation values
        controllerRotation: state.rotation,
        controllerPulse: state.pulse,
        controllerColorShift: state.colorShift % 1.0,
        controllerFrameCount: state.frameCount,

        // Custom beat detection
        customBeat: (features.bassNormalized || 0) > 0.8 && (features.spectralFluxZScore || 0) > 1.2,

        // Values calculated from audio features
        bassImpact: Math.pow(features.bassNormalized || 0, 2) * 2.0,
        midImpact: (features.midsNormalized || 0) * 1.5,
        trebleImpact: (features.trebleNormalized || 0) * 0.8,

        // Time-based values
        smoothTime: time * 0.5,
        beatTime: features.beat ? time : (state.frameCount % 100) * 0.01,

        // Combined audio reactivity metrics
        reactivity: (
          (features.spectralFluxNormalized || 0) +
          (features.bassNormalized || 0) +
          (features.energyNormalized || 0)
        ) / 3.0
      }
    }
  }
}
