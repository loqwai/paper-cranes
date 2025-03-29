/**
 * Simple function-based controller example
 *
 * This example demonstrates the simpler approach where the module directly
 * exports a controller function without using make().
 */

// State is kept in the module scope
let rotation = 0
let pulse = 0
let colorShift = 0
let frameCount = 0

/**
 * Direct controller function - gets called every frame
 * @param {Object} features - The flattened features object
 * @returns {Object} - Values to use in the feature precedence chain
 */
export default function controller(features) {
  // Get time from performance API
  const time = performance.now() / 1000

  // Update animation values
  rotation += 0.01 * (1 + features.bassNormalized * 2)
  pulse = Math.sin(time * 2) * 0.5 + 0.5
  colorShift += 0.005 * (1 + features.spectralFluxNormalized)
  frameCount++

  // Return features to be added to controllerFeatures object
  return {
    // Animation values
    controllerRotation: rotation,
    controllerPulse: pulse,
    controllerColorShift: colorShift % 1.0,
    controllerFrameCount: frameCount,

    // Custom beat detection
    customBeat: features.bassNormalized > 0.8 && features.spectralFluxZScore > 1.2,

    // Values calculated from audio features
    bassImpact: Math.pow(features.bassNormalized, 2) * 2.0,
    midImpact: features.midsNormalized * 1.5,
    trebleImpact: features.trebleNormalized * 0.8,

    // Time-based values
    smoothTime: time * 0.5,
    beatTime: features.beat ? time : (frameCount % 100) * 0.01,

    // Combined audio reactivity metrics
    reactivity: (
      features.spectralFluxNormalized +
      features.bassNormalized +
      features.energyNormalized
    ) / 3.0
  }
}
