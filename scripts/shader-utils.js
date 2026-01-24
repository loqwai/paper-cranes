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

  // Check for mainImage function
  if (!content.includes('mainImage')) {
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

  // Check for fragColor output
  if (content.includes('mainImage') && !content.includes('fragColor')) {
    errors.push('mainImage should write to fragColor parameter')
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
