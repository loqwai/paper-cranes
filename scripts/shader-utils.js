/**
 * Shared shader utilities for build system and CLI tools
 */

/**
 * Extracts metadata from shader comments
 * Looks for // @key: value patterns
 * @param {string} content - Shader source code
 * @returns {Object} Extracted metadata
 */
export const extractMetadata = (content) => {
  const meta = {}
  const metaRegex = /\/\/\s*@(\w+):\s*(.+)/g
  let match
  while ((match = metaRegex.exec(content)) !== null) {
    const [, key, value] = match
    const trimmedValue = value.trim()
    // Parse booleans
    if (trimmedValue === 'true') meta[key] = true
    else if (trimmedValue === 'false') meta[key] = false
    // Parse comma-separated lists
    else if (trimmedValue.includes(',')) meta[key] = trimmedValue.split(',').map(s => s.trim())
    else meta[key] = trimmedValue
  }
  return meta
}

/**
 * Validates shader syntax and structure
 * @param {string} content - Shader source code
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export const validateShader = (content) => {
  const errors = []
  const warnings = []

  // Check for mainImage function OR standalone main() with #version
  // Two valid formats:
  // 1. ShaderToy-style with mainImage (gets wrapped)
  // 2. Standalone with #version and main() (used as-is)
  const hasMainImage = content.includes('mainImage')
  const hasVersion = content.includes('#version')
  const hasMain = /void\s+main\s*\(/.test(content)

  if (!hasMainImage && !(hasVersion && hasMain)) {
    errors.push('Missing mainImage function. Shader must contain: void mainImage(out vec4 fragColor, in vec2 fragCoord)')
  }

  // Check for #version directive (optional but recommended)
  if (content.includes('#version') && !content.includes('#version 300 es')) {
    warnings.push('Consider using #version 300 es for WebGL2 compatibility')
  }

  // Check for common GLSL errors
  const lines = content.split('\n')
  lines.forEach((line, i) => {
    const lineNum = i + 1

    // Check for potential divide by zero
    if (/\/\s*[a-zA-Z_]\w*\s*[;,)\]]/.test(line) && !line.includes('max(') && !line.includes('clamp(')) {
      if (!line.includes('// safe') && !line.includes('//safe')) {
        warnings.push(`Line ${lineNum}: Potential divide by zero. Consider using max(value, 0.001)`)
      }
    }

    // Check for hardcoded resolution
    if (/\b(1920|1080|1280|720)\b/.test(line)) {
      warnings.push(`Line ${lineNum}: Hardcoded resolution value. Use iResolution instead`)
    }

    // Check for missing semicolons (basic check)
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('#') &&
        !trimmed.startsWith('{') && !trimmed.startsWith('}') &&
        !trimmed.endsWith('{') && !trimmed.endsWith('}') &&
        !trimmed.endsWith(';') && !trimmed.endsWith(',') &&
        !trimmed.endsWith('(') && !trimmed.endsWith(')') &&
        trimmed.length > 3) {
      // Only warn for lines that look like statements
      if (/^\s*(float|vec[234]|int|bool|mat[234]|return|if|for|while)\b/.test(line)) {
        // This is a rough heuristic, may have false positives
      }
    }
  })

  // Check for output parameter usage in mainImage (only for ShaderToy-style shaders)
  // Standalone shaders with #version have their own main() and don't need ShaderToy signature
  if (hasMainImage && !hasVersion) {
    const mainImageMatch = content.match(/void\s+mainImage\s*\(\s*out\s+vec4\s+(\w+)/i)
    if (!mainImageMatch) {
      errors.push('mainImage should have out vec4 parameter: void mainImage(out vec4 fragColor, in vec2 fragCoord)')
    }
  }

  // Check for gl_FragCoord usage pattern
  if (content.includes('mainImage') && content.includes('gl_FragCoord') && !content.includes('fragCoord')) {
    warnings.push('Use fragCoord parameter instead of gl_FragCoord inside mainImage')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Extracts preset URLs from shader comments
 * @param {string} content - Shader source code
 * @returns {string[]} Array of preset URLs
 */
export const extractPresets = (content) => {
  return content
    .split('\n')
    .filter(line => line.includes('http://') || line.includes('https://'))
    .filter(line => line.includes('?'))
    .map(line => {
      const match = line.match(/https?:\/\/[^\s]+/)
      return match ? match[0] : null
    })
    .filter(Boolean)
}

/**
 * Checks if shader handles fullscreen (non-square) aspect ratios
 * @param {string} content - Shader source code
 * @returns {boolean}
 */
export const detectsAspectRatio = (content) => {
  // Check for common aspect ratio handling patterns
  return (
    content.includes('iResolution.x / iResolution.y') ||
    content.includes('iResolution.x/iResolution.y') ||
    content.includes('resolution.x / resolution.y') ||
    content.includes('resolution.x/resolution.y') ||
    content.includes('aspect') ||
    /uv\s*\.\s*x\s*\*=/.test(content)
  )
}

/**
 * Gets list of audio features used in shader
 * @param {string} content - Shader source code
 * @returns {string[]} Array of feature names
 */
export const getUsedAudioFeatures = (content) => {
  const features = [
    'bass', 'mids', 'treble', 'energy',
    'spectralCentroid', 'spectralFlux', 'spectralSpread', 'spectralRolloff',
    'spectralRoughness', 'spectralKurtosis', 'spectralEntropy', 'spectralCrest',
    'spectralSkew', 'pitchClass', 'beat'
  ]

  const variations = ['', 'Normalized', 'Mean', 'Median', 'Min', 'Max', 'StandardDeviation', 'ZScore']

  const used = new Set()

  features.forEach(feature => {
    variations.forEach(variation => {
      const fullName = feature + variation
      if (content.includes(fullName)) {
        used.add(fullName)
      }
    })
  })

  return Array.from(used).sort()
}

/**
 * Extracts the knob_N uniforms a shader actually reads, together with whatever
 * human-readable name the source gives them.
 *
 * Two declaration forms; the explicit one wins:
 *
 *   // @knob: 141 TWIST STEP          <- explicit declaration, one per line
 *   gStep = PI * knob_141;  // K141 TWIST STEP (PI*0.025 .. PI*0.225)
 *
 * The second form is not a new invention — it is the convention the lattice
 * shaders already use on every knob line, so ~200 knobs across the repo are
 * already named. We parse it rather than asking anyone to restate it.
 *
 * The label is the leading run of SHOUTY tokens after the K-number: uppercase
 * words stop at the first lowercase word or punctuation blob, which is exactly
 * where these comments stop naming and start explaining.
 *
 * @param {string} content - Shader source code
 * @returns {{ n: number, label?: string }[]} sorted, one entry per knob
 */
export const extractKnobs = (content) => {
  const knobs = new Map() // n -> label | null

  // every knob_N the shader actually references
  for (const match of content.matchAll(/\bknob_(\d{1,3})\b/g)) {
    const n = Number(match[1])
    if (!knobs.has(n)) knobs.set(n, null)
  }

  // heuristic labels from `// K141 TWIST STEP ...` trailing comments
  for (const match of content.matchAll(/\bK(\d{1,3})\b[ \t]+([^\n]*)/g)) {
    const n = Number(match[1])
    if (!knobs.has(n) || knobs.get(n)) continue
    const label = shoutyLabel(match[2])
    if (label) knobs.set(n, label)
  }

  // explicit `// @knob: 141 TWIST STEP` always wins
  for (const match of content.matchAll(/\/\/\s*@knob:?\s*(\d{1,3})\s+([^\n]+)/g)) {
    knobs.set(Number(match[1]), match[2].trim().slice(0, 24))
  }

  return [...knobs.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([n, label]) => (label ? { n, label } : { n }))
}

const SHOUTY_TOKEN = /^[\p{Lu}\p{N}↔+\-/&%×°]+$/u

/**
 * Leading run of all-caps tokens, which is how these comments name a thing
 * before they start describing it. Returns null when there is no name there.
 * @param {string} rest - comment text following the K-number
 * @returns {string|null}
 */
const shoutyLabel = (rest) => {
  const words = []
  for (const raw of rest.trim().split(/\s+/)) {
    const word = raw.replace(/^[^\p{L}\p{N}]+/u, '').replace(/[^\p{L}\p{N}%×°↔]+$/u, '')
    if (!word || !SHOUTY_TOKEN.test(word) || !/\p{Lu}/u.test(word)) break
    words.push(word)
    if (words.length === 3) break
  }
  const label = words.join(' ')
  return label.length >= 2 && label.length <= 22 ? label : null
}

/**
 * shaders.json is fetched in full by the list page and the VJ pad, so the knob
 * index ships as one compact line per shader — `1|131:FOLD RATIO|132:DEPTH FOCUS`
 * — rather than one pretty-printed object per knob (which cost 96KB across the
 * repo, a 44% jump in the file everyone downloads).
 * @param {{n:number,label?:string}[]} knobs
 * @returns {string}
 */
export const formatKnobs = (knobs) =>
  knobs.map(({ n, label }) => (label ? `${n}:${label.replace(/\|/g, '/')}` : String(n))).join('|')

/**
 * @param {string|undefined} text - a `knobs` field from shaders.json
 * @returns {{n:number,label?:string}[]}
 */
export const parseKnobs = (text) =>
  (text ?? '')
    .split('|')
    .filter(Boolean)
    .map((part) => {
      const [n, ...rest] = part.split(':')
      const label = rest.join(':').trim()
      return label ? { n: Number(n), label } : { n: Number(n) }
    })
    .filter((knob) => Number.isFinite(knob.n))
