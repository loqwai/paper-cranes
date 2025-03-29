let startTime = null
const zoomStart = 4.0
const zoomSpeed = 0.25
// seconds of zoom before freezing

const centerX = -0.7436438870371587
const centerY =  0.13182590420531197

export default function controller(features) {
  if (!startTime) startTime = performance.now()
  const time = (performance.now() - startTime) / 1000
  const t = time

  const resolution = features.resolution || { x: 1280, y: 720 }
  const minDim = Math.min(resolution.x, resolution.y)

  const zoom = zoomStart * Math.exp(-zoomSpeed * t)
  const pixelSpan = zoom / minDim
  const screenOriginX = centerX - (resolution.x * pixelSpan) / 2
  const screenOriginY = centerY - (resolution.y * pixelSpan) / 2

  // Calculate iteration norm at center
  const centerIterNorm = (() => {
    let x = 0, y = 0, iter = 0, maxIter = 1000
    while (x * x + y * y <= 4 && iter < maxIter) {
      const xtemp = x * x - y * y + centerX
      y = 2 * x * y + centerY
      x = xtemp
      iter++
    }
    if (iter < maxIter) {
      const logZn = Math.log(x * x + y * y) / 2
      const nu = Math.log(logZn / Math.log(2)) / Math.log(2)
      return (iter + 1 - nu) / maxIter
    }
    return 1
  })()

  return {
    cameraScreenOriginX: screenOriginX,
    cameraScreenOriginY: screenOriginY,
    cameraPixelSpan: pixelSpan,
    centerIterNorm
  }
}
