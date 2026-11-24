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

  // Update animation values. Audio features are missing until audio starts (mic
  // prompt, file still loading): default them, or an accumulator goes NaN for good.
  rotation += 0.01 * (1 + (features.bassNormalized ?? 0) * 2)
  pulse = Math.sin(time * 2) * 0.5 + 0.5
  colorShift += 0.005 * (1 + (features.spectralFluxNormalized ?? 0))
  frameCount++

  // Return features to be added to controllerFeatures object
  return {
    // Animation values
    controllerRotation: rotation,
    controllerPulse: pulse,
    controllerColorShift: colorShift % 1.0,
    controllerFrameCount: frameCount,

    // Custom beat detection
    customBeat: (features.bassNormalized ?? 0) > 0.8 && (features.spectralFluxZScore ?? 0) > 1.2,

    // Values calculated from audio features
    bassImpact: Math.pow((features.bassNormalized ?? 0), 2) * 2.0,
    midImpact: (features.midsNormalized ?? 0) * 1.5,
    trebleImpact: (features.trebleNormalized ?? 0) * 0.8,

    // Time-based values
    smoothTime: time * 0.5,
    beatTime: features.beat ? time : (frameCount % 100) * 0.01,

    // Combined audio reactivity metrics
    reactivity: (
      (features.spectralFluxNormalized ?? 0) +
      (features.bassNormalized ?? 0) +
      (features.energyNormalized ?? 0)
    ) / 3.0
  }
}
