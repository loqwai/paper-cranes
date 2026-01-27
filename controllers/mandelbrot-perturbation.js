import { Decimal } from 'https://esm.sh/decimal.js@10.5.0'

Decimal.config({ precision: 50 })

let startTime = null
const zoomStart = 4.0
const zoomSpeed = 0.12

// Target: Seahorse valley boundary point
const centerXDecimal = new Decimal('-0.743643887037151')
const centerYDecimal = new Decimal('0.131825904205330')

// Reference orbit storage (computed at high precision)
const MAX_REF_ITERATIONS = 2000
let referenceOrbit = null
let lastZoomLevel = null

// Compute reference orbit at arbitrary precision
function computeReferenceOrbit(cx, cy, maxIter) {
  const orbit = []
  let zx = new Decimal(0)
  let zy = new Decimal(0)

  for (let i = 0; i < maxIter; i++) {
    // Store current z value
    orbit.push({
      x: zx.toNumber(),
      y: zy.toNumber()
    })

    // z = z² + c
    const zx2 = zx.mul(zx)
    const zy2 = zy.mul(zy)
    const zxy = zx.mul(zy)

    // Check escape
    if (zx2.plus(zy2).gt(1e10)) break

    const newZx = zx2.minus(zy2).plus(cx)
    const newZy = zxy.mul(2).plus(cy)

    zx = newZx
    zy = newZy
  }

  return orbit
}

// Pack orbit into uniform-friendly format
// Returns arrays of floats for X and Y components
function packOrbit(orbit, count) {
  const orbitX = new Float32Array(count)
  const orbitY = new Float32Array(count)

  for (let i = 0; i < count && i < orbit.length; i++) {
    orbitX[i] = orbit[i].x
    orbitY[i] = orbit[i].y
  }

  return { orbitX, orbitY, actualLength: Math.min(count, orbit.length) }
}

function splitDouble(value) {
  const high = Math.fround(value)
  const low = value - high
  return { high, low }
}

export default function controller(features) {
  if (!startTime) startTime = performance.now()
  const time = (performance.now() - startTime) / 1000

  // Exponential zoom
  const zoom = zoomStart * Math.exp(-zoomSpeed * time)

  const resolution = features.resolution || { x: 1280, y: 720 }
  const minDim = Math.min(resolution.x, resolution.y)
  const pixelSpan = zoom / minDim

  // Compute reference orbit (only once or when zoom changes significantly)
  if (!referenceOrbit || Math.abs(Math.log10(zoom) - Math.log10(lastZoomLevel || 1)) > 0.5) {
    // Estimate needed iterations based on zoom depth
    const neededIter = Math.min(MAX_REF_ITERATIONS, Math.max(100, Math.floor(300 - 50 * Math.log10(zoom))))
    referenceOrbit = computeReferenceOrbit(centerXDecimal, centerYDecimal, neededIter)
    lastZoomLevel = zoom
  }

  // Calculate screen origin with high precision
  const zoomDecimal = new Decimal(zoom)
  const pixelSpanDecimal = zoomDecimal.div(minDim)
  const halfWidthDecimal = pixelSpanDecimal.mul(resolution.x).div(2)
  const halfHeightDecimal = pixelSpanDecimal.mul(resolution.y).div(2)

  const screenOriginXDecimal = centerXDecimal.minus(halfWidthDecimal)
  const screenOriginYDecimal = centerYDecimal.minus(halfHeightDecimal)

  // Split for shader precision
  const originX = splitDouble(screenOriginXDecimal.toNumber())
  const originY = splitDouble(screenOriginYDecimal.toNumber())
  const pxSpan = splitDouble(pixelSpan)
  const centerX = splitDouble(centerXDecimal.toNumber())
  const centerY = splitDouble(centerYDecimal.toNumber())

  // Pack orbit data - send 256 iterations worth
  const ORBIT_SIZE = 256
  const packed = packOrbit(referenceOrbit, ORBIT_SIZE)

  // Build result with orbit data
  const result = {
    // Screen mapping
    screenOriginX: originX.high,
    screenOriginXLow: originX.low,
    screenOriginY: originY.high,
    screenOriginYLow: originY.low,
    pixelSpan: pxSpan.high,
    pixelSpanLow: pxSpan.low,

    // Reference point (center of zoom)
    refCenterX: centerX.high,
    refCenterXLow: centerX.low,
    refCenterY: centerY.high,
    refCenterYLow: centerY.low,

    // Zoom info
    zoomLevel: zoom,
    zoomExponent: Math.log10(1 / zoom),
    refOrbitLength: packed.actualLength,

    // Flag for perturbation mode
    usePerturbation: 1.0
  }

  // Add orbit data as individual uniforms (shader will need matching declarations)
  for (let i = 0; i < ORBIT_SIZE; i++) {
    result[`refOrbitX${i}`] = packed.orbitX[i] || 0
    result[`refOrbitY${i}`] = packed.orbitY[i] || 0
  }

  return result
}
