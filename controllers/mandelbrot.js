import {Decimal} from 'https://esm.sh/decimal.js@10.5.0'

let startTime = null
const zoomStart = 14.0
const zoomSpeed = (t) => 0.4

// Performance config - can be adjusted for different devices
const perfConfig = {
  highPerformance: {
    decimalPrecision: 128,
    maxIterations: 200,
    updateFrequency: 1,
    deepZoomThreshold: 1e-13,
    extremeZoomThreshold: 1e-50
  },
  mediumPerformance: {
    decimalPrecision: 64,
    maxIterations: 100,
    updateFrequency: 5,
    deepZoomThreshold: 1e-13,
    extremeZoomThreshold: 1e-50
  },
  lowPerformance: {
    decimalPrecision: 32,
    maxIterations: 50,
    updateFrequency: 15,
    deepZoomThreshold: 1e-13,
    extremeZoomThreshold: 1e-50
  }
}

// Get device performance level - default to medium
function getPerformanceLevel() {
  // Check for URL parameter
  const urlParams = new URLSearchParams(window.location.search)
  const perfParam = urlParams.get('performance')

  if (perfParam === 'high') return 'highPerformance'
  if (perfParam === 'low') return 'lowPerformance'
  if (perfParam === 'medium') return 'mediumPerformance'

  // Try to detect based on hardware
  const isHighEnd = window.navigator.hardwareConcurrency >= 8
  const isLowEnd = window.navigator.hardwareConcurrency <= 2 ||
                  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

  return 'highPerformance'
  if (isHighEnd) return 'highPerformance'
  if (isLowEnd) return 'lowPerformance'

  return 'mediumPerformance'
}

// Get the performance configuration
const performanceLevel = getPerformanceLevel()
const config = perfConfig[performanceLevel]

// Configure Decimal precision based on performance level
Decimal.config({
  precision: config.decimalPrecision,
  precisionTolerance: 1e-30
})

// Center at origin - always on/near the Julia set boundary
let centerXDecimal = new Decimal('0')
let centerYDecimal = new Decimal('0')
let centerX = 0
let centerY = 0

// Enhanced split function for better precision
function splitDouble(value) {
  // Handle very small values with better precision
  if (Math.abs(value) < 1e-30) {
    return { high: 0, low: 0 }
  }

  // For extreme precision, use a string-based approach
  if (Math.abs(value) < 1e-15) {
    const str = value.toString()
    const scientificMatch = str.match(/^(-?\d*\.?\d+)e([+-]\d+)$/)

    if (scientificMatch) {
      const mantissa = parseFloat(scientificMatch[1])
      const exponent = parseInt(scientificMatch[2])

      // Calculate a more precise split for very small numbers
      const high = mantissa * Math.pow(10, exponent)
      const remainder = value - high
      return { high, low: remainder }
    }
  }

  // Standard split for normal range values
  const high = Math.fround(value)
  const low = value - high

  return { high, low }
}

export default function controller(features) {
  if (!startTime) startTime = performance.now()
  const time = (performance.now() - startTime) / 1000
if(features.bassZScore > 0.9) startTime -= 100
  let t = time
  let baseZoom = zoomStart * Math.exp(-zoomSpeed(t) * t)

  let zoom = baseZoom;

  const resolution = features.resolution || { x: 1280, y: 720 }
  const minDim = Math.min(resolution.x, resolution.y)

  // Calculate zoom level

  // If time exceeds a certain threshold, start zooming out instead

  // Only use Decimal for deep zooms - threshold based on performance level
  if (zoom < config.deepZoomThreshold) {
    // Convert zoom to Decimal with enhanced precision formatting
    const zoomDecimal = new Decimal(zoom.toExponential(15))
    const minDimDecimal = new Decimal(minDim)

    // Calculate pixel span with high precision
    const pixelSpanDecimal = zoomDecimal.div(minDimDecimal)

    // Calculate screen origin with high precision
    const halfWidthDecimal = pixelSpanDecimal.mul(resolution.x).div(2)
    const halfHeightDecimal = pixelSpanDecimal.mul(resolution.y).div(2)

    const screenOriginXDecimal = centerXDecimal.minus(halfWidthDecimal)
    const screenOriginYDecimal = centerYDecimal.minus(halfHeightDecimal)

    // Enhanced splitting for better precision
    let screenOriginXSplit
    let screenOriginYSplit
    let pixelSpanSplit

    // For extreme zoom levels, use enhanced precision handling
    if (zoom < config.extremeZoomThreshold) {
      // Get full precision strings for extreme zoom levels
      const soXStr = screenOriginXDecimal.toString()
      const soYStr = screenOriginYDecimal.toString()
      const pSpanStr = pixelSpanDecimal.toString()

      screenOriginXSplit = splitDouble(Number(soXStr))
      screenOriginYSplit = splitDouble(Number(soYStr))
      pixelSpanSplit = splitDouble(Number(pSpanStr))

      // Also calculate auxiliary values for enhanced precision in shader
      const pixelSpanInvDecimal = minDimDecimal.div(zoomDecimal)
      const pixelSpanInvSplit = splitDouble(Number(pixelSpanInvDecimal.toString()))
    } else {
      // Standard precision splitting for normal deep zooms
      screenOriginXSplit = splitDouble(Number(screenOriginXDecimal.toString()))
      screenOriginYSplit = splitDouble(Number(screenOriginYDecimal.toString()))
      pixelSpanSplit = splitDouble(Number(pixelSpanDecimal.toString()))
    }

    // Calculate iteration norm (only update occasionally to save performance)
    // Update frequency depends on performance level
    const centerIterNorm = (t % config.updateFrequency < 0.1) ?
      calculateHighPrecisionIterNorm(centerXDecimal, centerYDecimal, config.maxIterations) : 0.5;

    return {
      cameraScreenOriginX: screenOriginXSplit.high,
      cameraScreenOriginXLow: screenOriginXSplit.low,
      cameraScreenOriginY: screenOriginYSplit.high,
      cameraScreenOriginYLow: screenOriginYSplit.low,
      cameraPixelSpan: pixelSpanSplit.high,
      cameraPixelSpanLow: pixelSpanSplit.low,
      centerIterNorm,
      currentZoomLevel: zoom,
      highPrecision: 1.0,
      zoomExponent: Math.log10(1.0 / zoom),
      extremeZoom: zoom < config.extremeZoomThreshold ? 1.0 : 0.0,
      performanceLevel: performanceLevel === 'highPerformance' ? 2.0 :
                        performanceLevel === 'mediumPerformance' ? 1.0 : 0.0
    }
  } else {
    // Use standard precision for better performance at shallow zoom
    const pixelSpan = zoom / minDim;
    const screenOriginX = centerX - (resolution.x * pixelSpan) / 2;
    const screenOriginY = centerY - (resolution.y * pixelSpan) / 2;

    // Simple calculation for better performance
    let centerIterNorm = 0.5;

    return {
      cameraScreenOriginX: screenOriginX,
      cameraScreenOriginXLow: 0,
      cameraScreenOriginY: screenOriginY,
      cameraScreenOriginYLow: 0,
      cameraPixelSpan: pixelSpan,
      cameraPixelSpanLow: 0,
      centerIterNorm,
      currentZoomLevel: zoom,
      highPrecision: 0.0,
      zoomExponent: Math.log10(1.0 / zoom),
      extremeZoom: 0.0,
      performanceLevel: performanceLevel === 'highPerformance' ? 2.0 :
                        performanceLevel === 'mediumPerformance' ? 1.0 : 0.0
    }
  }
}

// Enhanced calculation for better precision in iteration
function calculateHighPrecisionIterNorm(centerXDecimal, centerYDecimal, maxIter) {
  let x = new Decimal(0)
  let y = new Decimal(0)

  for (let iter = 0; iter < maxIter; iter++) {
    const xSq = x.mul(x)
    const ySq = y.mul(y)
    const twoXY = x.mul(y).mul(2)

    const nextX = xSq.minus(ySq).plus(centerXDecimal)
    const nextY = twoXY.plus(centerYDecimal)

    x = nextX
    y = nextY

    const magSquared = x.mul(x).plus(y.mul(y))
    if (magSquared.greaterThan(4)) {
      return iter / maxIter; // Simplified calculation
    }
  }

  return 1
}
