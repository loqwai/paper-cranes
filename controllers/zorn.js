/**
 * Controller for the zorn-zoom shader.
 * Drives complex, time-varying parameters for pattern generation.
 */

const PI = Math.PI

/**
 * Initialize the controller.
 * @param {Object} cranes - The global cranes object.
 * @returns {Function} - The controller function called each frame.
 */
export function make(cranes) {
  // No persistent state needed yet.

  /**
   * Controller function called each frame.
   * @param {Object} features - The flattened features object (includes iTime).
   * @returns {Object} - Values to pass to the shader as uniforms.
   */
  return function controller(features) {
    const time = features.iTime || (performance.now() / 1000) // Fallback if iTime not present

    // Base cyclical angle (0 to 2PI)
    const angle = (time * 0.1) % (2.0 * PI)

    // Time-varying multiplier components using different frequencies
    const multX = 1.0 + 0.5 * Math.sin(time * 0.11)
    const multY = 1.0 + 0.5 * Math.cos(time * 0.07 + 1.5)

    // Time-varying variation
    const variation = 0.95 + 0.05 * Math.sin(time * 0.13 + 0.8)

    // Time-varying color phase
    const colorPhase = time * 0.15

    // Adaptive smoothing (example, similar to before)
    const adaptiveSmooth = 0.4 + 0.3 * Math.abs(Math.cos(angle * 2.0))

    // Could add audio reactivity here later
    // E.g., const audioMod = features.bassNormalized * 0.1;

    return {
      controllerAngle: angle,
      controllerMultX: multX,
      controllerMultY: multY,
      controllerVariation: variation,
      controllerColorPhase: colorPhase,
      controllerAdaptiveSmooth: adaptiveSmooth,
    }
  }
}
