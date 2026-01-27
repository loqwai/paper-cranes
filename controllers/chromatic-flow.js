import { Decimal } from 'https://esm.sh/decimal.js@10.5.0'

// Configure Decimal for high precision
Decimal.config({ precision: 64 })

let startTime = null
const zoomSpeed = 0.15  // Slower zoom for raymarching

// Camera target point inside the Mandelbox
// This is a point with interesting structure
const targetX = new Decimal('0.1')
const targetY = new Decimal('0.3')
const targetZ = new Decimal('0.2')

// Starting camera position
const startCamX = new Decimal('2.2')
const startCamY = new Decimal('1.4')
const startCamZ = new Decimal('-2.3')

// Look-at point
const lookAtX = new Decimal('-0.1')
const lookAtY = new Decimal('0.2')
const lookAtZ = new Decimal('0.4')

// Split a number into high and low float components
function splitDouble(value) {
  if (typeof value === 'object' && value.toNumber) {
    value = value.toNumber()
  }
  const high = Math.fround(value)
  const low = value - high
  return { high, low }
}

// Interpolate between two Decimals
function lerpDecimal(a, b, t) {
  return a.plus(b.minus(a).mul(t))
}

export default function controller(features) {
  if (!startTime) startTime = performance.now()
  const time = (performance.now() - startTime) / 1000

  // Audio modulation of zoom speed
  const audioBoost = features.spectralFluxZScore > 0.5 ? 0.05 : 0
  const effectiveSpeed = zoomSpeed + audioBoost

  // Calculate zoom progress (0 = start, 1 = at target)
  // Use sigmoid-like curve for smooth approach
  const rawProgress = 1 - Math.exp(-effectiveSpeed * time)
  const zoomProgress = Math.min(rawProgress, 0.999)  // Never quite reach target

  // Interpolate camera position toward target
  const camX = lerpDecimal(startCamX, targetX, zoomProgress)
  const camY = lerpDecimal(startCamY, targetY, zoomProgress)
  const camZ = lerpDecimal(startCamZ, targetZ, zoomProgress)

  // Calculate distance from target (for zoom level indication)
  const dx = camX.minus(targetX)
  const dy = camY.minus(targetY)
  const dz = camZ.minus(targetZ)
  const distanceToTarget = Math.sqrt(
    dx.mul(dx).plus(dy.mul(dy)).plus(dz.mul(dz)).toNumber()
  )

  // Split all coordinates for precision
  const camXSplit = splitDouble(camX)
  const camYSplit = splitDouble(camY)
  const camZSplit = splitDouble(camZ)

  const lookXSplit = splitDouble(lookAtX)
  const lookYSplit = splitDouble(lookAtY)
  const lookZSplit = splitDouble(lookAtZ)

  // Audio-reactive modulations (small, additive)
  const audioOffsetX = (features.spectralCentroidZScore || 0) * 0.02
  const audioOffsetY = (features.midsZScore || 0) * 0.01
  const audioOffsetZ = (features.spectralFluxZScore || 0) * 0.03

  // Time-based gentle sway
  const swayX = Math.sin(time * 0.15) * 0.02 * distanceToTarget
  const swayY = Math.sin(time * 0.12) * Math.cos(time * 0.08) * 0.01 * distanceToTarget

  return {
    // Camera position (high precision)
    camPosX: camXSplit.high,
    camPosXLow: camXSplit.low,
    camPosY: camYSplit.high,
    camPosYLow: camYSplit.low,
    camPosZ: camZSplit.high,
    camPosZLow: camZSplit.low,

    // Look-at position (high precision)
    lookAtX: lookXSplit.high,
    lookAtXLow: lookXSplit.low,
    lookAtY: lookYSplit.high,
    lookAtYLow: lookYSplit.low,
    lookAtZ: lookZSplit.high,
    lookAtZLow: lookZSplit.low,

    // Audio + sway offsets (applied in shader)
    audioSwayX: audioOffsetX + swayX,
    audioSwayY: audioOffsetY + swayY,
    audioSwayZ: audioOffsetZ,

    // Zoom info
    zoomProgress,
    distanceToTarget,
    zoomLevel: 1.0 / (distanceToTarget + 0.001),

    // Controller active flag
    controllerActive: 1.0
  }
}
