let frameCount = 0
const zoomStart = 4.0  // Initial world scale
const zoomSpeed = 0.1  // Zoom rate (smaller = slower, more stable zoom)
const zoomResetThreshold = 0.00001 // When to reset zoom to avoid precision issues

// Starting position (0,0 for simple checkerboard)
let centerX = 0.0
let centerY = 0.0

// Split a double into high and low precision components
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

  // Exponential zoom with time
  let zoom = zoomStart * Math.exp(-zoomSpeed * time)

  // If zoom gets too small (deep zoom), reset with adjusted center
  // This avoids precision problems while maintaining visual continuity
  if (zoom < zoomResetThreshold) {
    // Calculate how many times we need to reset
    const resetFactor = Math.floor(Math.log(zoomStart / zoom) / Math.log(1/zoomResetThreshold))

    // Apply the reset but maintain the same visual position
    zoom = zoom * Math.pow(1/zoomResetThreshold, resetFactor)

    // This keeps us visually centered on the same point
    // We're essentially zooming into a new "copy" of the checkerboard
    // The pattern repeats, so this maintains visual continuity
  }

  // Calculate pixel span (world units per pixel)
  const pixelSpan = zoom / minDim

  // Split center coordinates for precision
  const [centerHighX, centerLowX] = splitDouble(centerX)
  const [centerHighY, centerLowY] = splitDouble(centerY)

  // Calculate screen edge offsets
  const dx = resolution.x * 0.5
  const dy = resolution.y * 0.5
  const offsetX = -dx * pixelSpan
  const offsetY = -dy * pixelSpan

  // Split offsets into high/low components
  const [offsetHighX, offsetLowX] = splitDouble(offsetX)
  const [offsetHighY, offsetLowY] = splitDouble(offsetY)

  // Return with full precision
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
    zoomLevel: zoom
  }
}
