let frameCount = 0
const zoomStart = 4.0  // Initial zoom scale (higher = more zoomed out)
const zoomSpeed = 1.1  // How fast we zoom in (smaller = slower, more stable zoom)

// Adjust to zoom into an interesting checkerboard area
const centerX = 0.0   // Center at origin for checkerboard
const centerY = 0.0

// Split a double into high and low precision components
// This is critical for maintaining precision during deep zooms
function splitDouble(x) {
  const hi = Math.fround(x)
  const lo = x - hi
  return [hi, lo]
}

export default function controller(features) {
  const time = performance.now() / 1000
  frameCount++

  const resolution = features.resolution || { x: 1280, y: 720 }
  const minDim = Math.min(resolution.x, resolution.y)

  // Exponential zoom with time - this gives a smooth, continuous zoom
  // Math.exp ensures we never reach zero (avoiding division by zero)
  const zoom = zoomStart * Math.exp(-zoomSpeed * time)

  // Calculate pixel span - this is how much world space each pixel covers
  const pixelSpan = zoom / minDim

  // Split center coordinates into high and low precision components
  // This technique preserves precision much better than a single float
  const [centerHighX, centerLowX] = splitDouble(centerX)
  const [centerHighY, centerLowY] = splitDouble(centerY)

  // Calculate viewport offset from center
  const dx = resolution.x * 0.5
  const dy = resolution.y * 0.5

  // These offsets determine where in world space the screen edges are
  const offsetX = -dx * pixelSpan
  const offsetY = -dy * pixelSpan

  // Split offsets into high and low precision components
  const [offsetHighX, offsetLowX] = splitDouble(offsetX)
  const [offsetHighY, offsetLowY] = splitDouble(offsetY)

  // Return all the precision components separately
  // The shader will recombine these to get full precision coordinates
  return {
    controllerFrameCount: frameCount,
    cameraCenterHighX: centerHighX,
    cameraCenterLowX: centerLowX,
    cameraCenterHighY: centerHighY,
    cameraCenterLowY: centerLowY,
    offsetHighX,
    offsetLowX,
    offsetHighY,
    offsetLowY,
    // Also return the raw zoom value for debugging
    zoomLevel: zoom
  }
}
