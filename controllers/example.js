/**
 * Example controller
 *
 * This file demonstrates how to create a controller for a shader.
 * The controller exports a make() function that initializes the controller
 * and returns a controller function that gets called on each frame.
 */

/**
 * Initialize the controller and return a controller function
 * @param {Object} cranes - The global cranes object for initialization
 * @returns {Function} - The controller function that will be called each frame
 */
export function make(cranes) {
  console.log('Controller initializing with:', cranes)

  // Initialize persistent state for this controller
  const state = {
    rotation: 0,
    pulse: 0,
    colorShift: 0,
    frameCount: 0
  }

  /**
   * Controller function called each frame
   * @param {Object} features - The flattened features object
   * @returns {Object} - Values to use in the feature precedence chain
   */
  return function controller(features) {
    // Get time from performance API
    const time = performance.now() / 1000

    // Update animation values
    state.rotation += 0.01 * (1 + features.bassNormalized * 2)
    state.pulse = Math.sin(time * 2) * 0.5 + 0.5
    state.colorShift += 0.005 * (1 + features.spectralFluxNormalized)
    state.frameCount++

    // Return features to be added to controllerFeatures object
    return {
      // Animation values
      controllerRotation: state.rotation,
      controllerPulse: state.pulse,
      controllerColorShift: state.colorShift % 1.0,
      controllerFrameCount: state.frameCount,

      // Custom beat detection
      customBeat: features.bassNormalized > 0.8 && features.spectralFluxZScore > 1.2,

      // Values calculated from audio features
      bassImpact: Math.pow(features.bassNormalized, 2) * 2.0,
      midImpact: features.midsNormalized * 1.5,
      trebleImpact: features.trebleNormalized * 0.8,

      // Time-based values
      smoothTime: time * 0.5,
      beatTime: features.beat ? time : (state.frameCount % 100) * 0.01,

      // Combined audio reactivity metrics
      reactivity: (
        features.spectralFluxNormalized +
        features.bassNormalized +
        features.energyNormalized
      ) / 3.0
    }
  }
}
