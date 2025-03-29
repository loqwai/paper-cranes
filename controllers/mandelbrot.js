let frameCount = 0
const zoomStart = 4.0
const zoomSpeed = 0.25
const centerX = -0.7436438870371587
const centerY = 0.13182590420531197

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

  const zoom = zoomStart * Math.exp(-zoomSpeed * time)
  const pixelSpan = zoom / minDim

  const screenOriginX = centerX - (resolution.x * pixelSpan) / 2
  const screenOriginY = centerY - (resolution.y * pixelSpan) / 2

  const [hiX, loX] = splitDouble(screenOriginX)
  const [hiY, loY] = splitDouble(screenOriginY)
  const [hiS, loS] = splitDouble(pixelSpan)

  const zoomDepth = Math.log2(1 / pixelSpan)
  const detailEnhancement = Math.max(0, Math.min(1, (zoomDepth - 3) / 5))
  const deepZoom = Math.max(0, Math.min(1, (zoomDepth - 8) / 7))

  return {
    cameraScreenOriginHighX: hiX,
    cameraScreenOriginLowX: loX,
    cameraScreenOriginHighY: hiY,
    cameraScreenOriginLowY: loY,
    cameraPixelSpanHigh: hiS,
    cameraPixelSpanLow: loS,
    zoomDepth,
    detailEnhancement,
    deepZoom
  }
}
