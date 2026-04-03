import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { computeAdaptiveSmoothing } from './adaptiveSmoothing.js'

// --- test helpers ---

const linearRegression = (values) => {
  const n = values.length
  if (n < 2) return { rSquared: 0 }
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0
  for (let i = 0; i < n; i++) {
    sumX += i
    sumY += values[i]
    sumXY += i * values[i]
    sumX2 += i * i
  }
  const meanY = sumY / n
  const denom = n * sumX2 - sumX * sumX
  if (denom === 0) return { rSquared: 0 }
  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n
  let ssTot = 0, ssRes = 0
  for (let i = 0; i < n; i++) {
    ssTot += (values[i] - meanY) ** 2
    ssRes += (values[i] - (slope * i + intercept)) ** 2
  }
  return { rSquared: ssTot === 0 ? 0 : Math.max(0, 1 - ssRes / ssTot) }
}

const smooth = (values, alphaFn) => {
  const result = [values[0]]
  for (let i = 1; i < values.length; i++) {
    const alpha = alphaFn(values, i)
    result.push(result[i - 1] * (1 - alpha) + values[i] * alpha)
  }
  return result
}

const staticSmooth = (values, alpha) => smooth(values, () => alpha)

const adaptiveSmooth = (values, smoothing, windowSize = 50) =>
  smooth(values, (vals, i) => {
    const window = vals.slice(Math.max(0, i - windowSize), i)
    const { rSquared } = linearRegression(window)
    return computeAdaptiveSmoothing({ smoothing, rSquared })
  })

const measureJitter = (values) => {
  let total = 0
  for (let i = 1; i < values.length; i++) total += Math.abs(values[i] - values[i - 1])
  return total / (values.length - 1)
}

const mse = (a, b) => a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0) / a.length

describe('computeAdaptiveSmoothing', () => {
  it('returns a number', () => {
    expect(computeAdaptiveSmoothing({})).toBeTypeOf('number')
  })

  it('high smoothing (0.9) produces low alpha', () => {
    expect(computeAdaptiveSmoothing({ smoothing: 0.9 })).toBeLessThan(0.5)
  })

  it('low smoothing (0.1) produces high alpha', () => {
    expect(computeAdaptiveSmoothing({ smoothing: 0.1 })).toBeGreaterThan(0.5)
  })

  it('high rSquared increases alpha (more responsive to coherent signal)', () => {
    const noisy = computeAdaptiveSmoothing({ smoothing: 0.5, rSquared: 0.1 })
    const coherent = computeAdaptiveSmoothing({ smoothing: 0.5, rSquared: 0.9 })
    expect(coherent).toBeGreaterThan(noisy)
  })

  it('higher smoothing always produces lower alpha', () => {
    const low = computeAdaptiveSmoothing({ smoothing: 0.3 })
    const mid = computeAdaptiveSmoothing({ smoothing: 0.5 })
    const high = computeAdaptiveSmoothing({ smoothing: 0.7 })
    expect(high).toBeLessThan(mid)
    expect(mid).toBeLessThan(low)
  })

  it('clamps rSquared to [0, 1]', () => {
    expect(computeAdaptiveSmoothing({ rSquared: 2.0 })).toBe(computeAdaptiveSmoothing({ rSquared: 1.0 }))
    expect(computeAdaptiveSmoothing({ rSquared: -1.0 })).toBe(computeAdaptiveSmoothing({ rSquared: 0.0 }))
  })

  it('near-zero rSquared dampens hard (< 0.2x base alpha)', () => {
    const baseAlpha = 0.15
    const alpha = computeAdaptiveSmoothing({ smoothing: 0.85, rSquared: 0.03 })
    expect(alpha).toBeLessThan(baseAlpha * 0.2)
  })

  it('at rSquared=0.5 returns the base alpha (1 - smoothing)', () => {
    expect(computeAdaptiveSmoothing({ smoothing: 0.85, rSquared: 0.5 })).toBeCloseTo(0.15, 5)
    expect(computeAdaptiveSmoothing({ smoothing: 0.5, rSquared: 0.5 })).toBeCloseTo(0.5, 5)
    expect(computeAdaptiveSmoothing({ smoothing: 0.9, rSquared: 0.5 })).toBeCloseTo(0.1, 5)
  })

  it('alpha stays in [0, 1] across the input range', () => {
    for (const smoothing of [0, 0.1, 0.5, 0.9, 1.0]) {
      for (const rSquared of [0, 0.5, 1.0]) {
        const alpha = computeAdaptiveSmoothing({ smoothing, rSquared })
        expect(alpha).toBeGreaterThanOrEqual(0)
        expect(alpha).toBeLessThanOrEqual(1)
      }
    }
  })
})

describe('adaptive smoothing with real audio', () => {
  const analysisPath = '/Users/hypnodroid/THE_SINK/paper-cranes/analysis/imaginary-friends-analysis.json'
  const frames = JSON.parse(readFileSync(analysisPath))
  const midStart = Math.floor(frames.length / 3)
  const slice = frames.slice(midStart, midStart + 2000)
  const energyValues = slice.map(f => f.features.energy)

  it('reduces jitter compared to raw signal', () => {
    const rawJitter = measureJitter(energyValues)
    const adaptiveJitter = measureJitter(adaptiveSmooth(energyValues, 0.85))
    expect(adaptiveJitter).toBeLessThan(rawJitter)
  })

  it('is smoother than very light static smoothing', () => {
    const lightJitter = measureJitter(staticSmooth(energyValues, 0.5))
    const adaptiveJitter = measureJitter(adaptiveSmooth(energyValues, 0.85))
    expect(adaptiveJitter).toBeLessThan(lightJitter)
  })

  it('tracks the raw signal better than very heavy static smoothing', () => {
    const heavyMSE = mse(energyValues, staticSmooth(energyValues, 0.02))
    const adaptiveMSE = mse(energyValues, adaptiveSmooth(energyValues, 0.85))
    expect(adaptiveMSE).toBeLessThan(heavyMSE)
  })
})
