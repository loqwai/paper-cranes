export const computeAdaptiveSmoothing = ({ smoothing = 0.85, rSquared = 0.5 } = {}) => {
  const r = Math.max(0, Math.min(1, rSquared))
  const baseAlpha = 1 - smoothing
  // r=0 → 0.05x base (crush noise), r=0.5 → 1x base (neutral), r=1 → 1.95x base (trust trend)
  const scale = 0.05 + r * 1.9
  return Math.min(1, baseAlpha * scale)
}
