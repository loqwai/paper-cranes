import BigNumber from 'bignumber.js'

// Performance configurations based on device capabilities
const performanceConfig = {
  high: {
    decimalPlaces: 500,
    maxIterations: 800,
    exponentialAt: 1e9
  },
  medium: {
    decimalPlaces: 250,
    maxIterations: 500,
    exponentialAt: 1e9
  },
  low: {
    decimalPlaces: 60,
    maxIterations: 200,
    exponentialAt: 1e9
  }
}

// Determine performance level - simplified and defaults to high
const getPerformanceLevel = () => {
  return 'high'
}

const performanceLevel = getPerformanceLevel()
const config = performanceConfig[performanceLevel]

// Configure BigNumber once
BigNumber.config({
  DECIMAL_PLACES: config.decimalPlaces,
  EXPONENTIAL_AT: config.exponentialAt
})

// Deep Structure coordinates
const deepStructure = {
  x: '-0.743643887037151',
  y: '0.13182590420533'
}

// Stable timing and state management
let startTime = null
let lastFrameTime = 0
let frameCount = 0

// State control for smooth zooming
const zoomStart = 14.0
const zoomSpeed = 0.4
const resetZoomThreshold = 1e-15
const resetZoomRatio = 16.0
let lastResetZoom = 1.0

// Current view coordinates
const currentLocation = {
  x: new BigNumber(deepStructure.x),
  y: new BigNumber(deepStructure.y)
}

// Calculation cache
let calculationCache = {
  lastZoom: null,
  viewParameters: null,
  screenOrigin: null,
  lastUpdateTime: 0
}

// Use the power of BigNumber directly for coordinate precision
function calculateViewBounds(zoom, resolution) {
  // Round zoom to ensure stable frame-to-frame calculations
  const zoomBN = new BigNumber(zoom).toFixed(10);

  // Return cached values if zoom hasn't changed
  if (calculationCache.lastZoom === zoomBN && calculationCache.viewParameters) {
    return calculationCache.viewParameters;
  }

  // Update zoom cache
  calculationCache.lastZoom = zoomBN;

  // Calculate view dimensions
  const minDimension = Math.min(resolution.x, resolution.y);
  const pixelSpan = new BigNumber(zoomBN).dividedBy(minDimension);
  const halfWidth = pixelSpan.times(resolution.x).dividedBy(2);
  const halfHeight = pixelSpan.times(resolution.y).dividedBy(2);

  // Cache and return results
  calculationCache.viewParameters = {
    pixelSpan,
    halfWidth,
    halfHeight
  };

  return calculationCache.viewParameters;
}

// Transfer BigNumber data to shader using high and low precision components
// Simple and consistent approach for all number ranges
function bigNumberToComponents(bn) {
  // First get integer part using BigNumber's built-in method
  const intPart = bn.integerValue(BigNumber.ROUND_DOWN);

  // Get fractional part by subtraction
  const fracPart = bn.minus(intPart);

  // Convert integer part to JavaScript number (high precision component)
  const high = intPart.isZero() ? 0 : Number(intPart.toString());

  // Convert fractional part to JavaScript number (low precision component)
  const low = fracPart.isZero() ? 0 : Number(fracPart.toString());

  return { high, low };
}

// Main controller function
export default function controller(features) {
  // Initialize timing on first call
  if (!startTime) startTime = performance.now();

  // Calculate time with stable frame updates
  const currentTime = performance.now();
  const elapsedTime = (currentTime - startTime) / 1000;

  // Track frame timing
  const deltaTime = elapsedTime - lastFrameTime;
  lastFrameTime = elapsedTime;
  frameCount++;

  // Stabilize time to prevent micro-fluctuations
  const stableTime = Math.floor(elapsedTime * 100) / 100;

  // Calculate exponential zoom level
  let zoom = zoomStart * Math.exp(-zoomSpeed * stableTime);

  // Reset zoom if we go too deep, but keep the same location
  if (zoom < resetZoomThreshold && zoom < lastResetZoom / resetZoomRatio) {
    // Record new reset point
    lastResetZoom = zoom;

    // Clear calculation cache for fresh calculations
    calculationCache = {
      lastZoom: null,
      viewParameters: null,
      screenOrigin: null,
      lastUpdateTime: 0
    };
  }

  // Get screen resolution with fallback
  const resolution = features.resolution || { x: 1280, y: 720 };

  // Calculate view parameters using BigNumber
  const viewBounds = calculateViewBounds(zoom, resolution);

  // Update screen origin for stability (less frequently at deeper zooms)
  const updateThreshold = Math.max(0.1, Math.min(0.5, Math.pow(zoom, 0.25) * 0.1));
  if (!calculationCache.screenOrigin || Math.abs(stableTime - calculationCache.lastUpdateTime) > updateThreshold) {
    calculationCache.screenOrigin = {
      x: currentLocation.x.minus(viewBounds.halfWidth),
      y: currentLocation.y.minus(viewBounds.halfHeight)
    };
    calculationCache.lastUpdateTime = stableTime;
  }

// NEW: center is always (0, 0) in shader space
const offsetComponents = {
  x: { high: 0.0, low: 0.0 },
  y: { high: 0.0, low: 0.0 }
};

// Shift origin so (0,0) is currentLocation in shader
calculationCache.screenOrigin = {
  x: currentLocation.x.minus(viewBounds.halfWidth),
  y: currentLocation.y.minus(viewBounds.halfHeight)
};

// Pass origin as actual fractal coordinates
const originComponents = {
  x: bigNumberToComponents(calculationCache.screenOrigin.x),
  y: bigNumberToComponents(calculationCache.screenOrigin.y)
};

  // Calculate pixel span for coordinate conversion
  const pixelSpanComponents = bigNumberToComponents(viewBounds.pixelSpan);

  // Calculate zoom exponent for color cycling
  const zoomExponent = Math.log10(1.0 / zoom);

  // Return values to shader with high precision components
  return {
    offsetX_high: originComponents.x.high,
    offsetX_low: originComponents.x.low,
    offsetY_high: originComponents.y.high,
    offsetY_low: originComponents.y.low,

    // Pixel span (high/low components)
    pixelSpan_high: pixelSpanComponents.high,
    pixelSpan_low: pixelSpanComponents.low,

    // Iteration and visual control
    maxIterations: config.maxIterations,
    currentZoomLevel: zoom,
    zoomExponent: zoomExponent,
    colorCycle: (zoomExponent * 0.05) % 1.0,
    zoomCycle: 5, // Fixed to a specific color palette

    // Transition control
    transitionBlend: 0.0,

    // Performance level
    performanceLevel: performanceLevel === 'high' ? 2.0 :
                      performanceLevel === 'medium' ? 1.0 : 0.0,

    // Location info for UI
    locationName: 'Deep Structure'
  };
}
