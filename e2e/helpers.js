// ── Feature math (runs in node, on collected samples) ───────────────────────

export const swing = (samples, key) => {
  const vals = samples.map(s => s[key])
  return Math.max(...vals) - Math.min(...vals)
}

export const mean = (samples, key) => {
  const vals = samples.map(s => s[key])
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

export const stddev = (samples, key) => {
  const avg = mean(samples, key)
  const vals = samples.map(s => s[key])
  return Math.sqrt(vals.reduce((sum, v) => sum + (v - avg) ** 2, 0) / vals.length)
}

export const maxConsecutiveDiff = (samples, key) => {
  let max = 0
  for (let i = 1; i < samples.length; i++) {
    max = Math.max(max, Math.abs(samples[i][key] - samples[i - 1][key]))
  }
  return max
}
