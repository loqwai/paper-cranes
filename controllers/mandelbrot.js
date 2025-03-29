let zoomStart = 1.0
let zoomSpeed = 0.05

export default function controller(features) {
  const time = performance.now() / 1000
  const cameraScale = zoomStart * Math.exp(-zoomSpeed * time)

  return {
    cameraCenterX: 0.0,
    cameraCenterY: 0.0,
    cameraScale
  }
}
