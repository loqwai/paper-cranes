import Decimal from 'decimal.js'

let startTime = null
const zoomStart = 4.0
const zoomSpeed = 0.3

// Performance config - can be adjusted for different devices
const perfConfig = {
  highPerformance: {
    decimalPrecision: 64,
    maxIterations: 200,
    updateFrequency: 1,
    deepZoomThreshold: 1e-10,
    extremeZoomThreshold: 1e-50
  },
  mediumPerformance: {
    decimalPrecision: 32,
    maxIterations: 100,
    updateFrequency: 5,
    deepZoomThreshold: 1e-6,
    extremeZoomThreshold: 1e-20
  },
  lowPerformance: {
    decimalPrecision: 20,
    maxIterations: 50,
    updateFrequency: 15,
    deepZoomThreshold: 1e-4,
    extremeZoomThreshold: 1e-10
  }
}

// Get device performance level - default to medium
function getPerformanceLevel() {
  // Check for URL parameter
  const urlParams = new URLSearchParams(window.location.search)
  const perfParam = urlParams.get('performance')

  if (perfParam === 'high') return 'highPerformance'
  if (perfParam === 'low') return 'lowPerformance'

  // Try to detect based on hardware
  const isHighEnd = window.navigator.hardwareConcurrency >= 8
  const isLowEnd = window.navigator.hardwareConcurrency <= 2 ||
                  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

  return 'highPerformance'
  // if (isHighEnd) return 'highPerformance'
  // if (isLowEnd) return 'lowPerformance'

  // return 'mediumPerformance'
}

// Get the performance configuration
const performanceLevel = getPerformanceLevel()
const config = perfConfig[performanceLevel]
console.log(`Using ${performanceLevel} settings`)

// Configure Decimal precision based on performance level
Decimal.config({ precision: config.decimalPrecision, rounding: 4 })

// Interesting Julia set coordinates
const centerXDecimal = new Decimal('-0.945428')
const centerYDecimal = new Decimal('0.213009')
const centerX = -0.945428
const centerY = 0.213009

// Optimized split function for better performance
function splitDouble(value) {
  if (Math.abs(value) < 1e-150) {
    return { high: 0, low: 0 };
  }

  const high = Math.fround(value);
  const low = value - high;

  return { high, low }
}

export default function controller(features) {
  if (!startTime) startTime = performance.now()
  const time = (performance.now() - startTime) / 1000
  const t = time

  const resolution = features.resolution || { x: 1280, y: 720 }
  const minDim = Math.min(resolution.x, resolution.y)

  // Calculate zoom level
  const baseZoom = zoomStart * Math.exp(-zoomSpeed * t)
  let zoom = baseZoom;

  // Only log occasionally to reduce overhead
  if (t % 15 < 0.1) {
    console.log(`Zoom level: ${zoom.toExponential(5)}, Time: ${t.toFixed(1)}s, Performance: ${performanceLevel}`);
  }

  // Only use Decimal for deep zooms - threshold based on performance level
  if (zoom < config.deepZoomThreshold) {
    // Convert zoom to Decimal with precision according to performance level
    const zoomDecimal = new Decimal(zoom.toExponential(10))
    const minDimDecimal = new Decimal(minDim)

    // Calculate pixel span with high precision
    const pixelSpanDecimal = zoomDecimal.div(minDimDecimal)

    // Calculate screen origin with high precision
    const halfWidthDecimal = pixelSpanDecimal.mul(resolution.x).div(2)
    const halfHeightDecimal = pixelSpanDecimal.mul(resolution.y).div(2)

    const screenOriginXDecimal = centerXDecimal.minus(halfWidthDecimal)
    const screenOriginYDecimal = centerYDecimal.minus(halfHeightDecimal)

    // Use simplified approach for better performance
    const screenOriginXSplit = splitDouble(Number(screenOriginXDecimal.toString()))
    const screenOriginYSplit = splitDouble(Number(screenOriginYDecimal.toString()))
    const pixelSpanSplit = splitDouble(Number(pixelSpanDecimal.toString()))

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

// Simplified calculation for better performance
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
