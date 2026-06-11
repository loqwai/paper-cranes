import { getRelativeOrAbsoluteShaderUrl } from './utils.js'
import { getHashParams, setHashParam } from './params/urlParams.js'

/**
 * Load a shader and apply all associated side effects
 * @param {string} shaderPath - Path to shader or full URL
 * @param {Object} options - Options
 * @param {boolean} options.updateUrl - Whether to update browser URL (default: false)
 * @returns {Promise<{code: string, fullscreen: boolean}>}
 */
export const loadShader = async (shaderPath, { updateUrl = false } = {}) => {
  const code = await getRelativeOrAbsoluteShaderUrl(shaderPath)

  // Parse metadata
  const fullscreen = code.includes('@fullscreen: true')

  // Store shader globally
  if (window.cranes) {
    window.cranes.shader = code
  }

  // Apply fullscreen class if canvas exists (for dynamic switching)
  const canvas = document.getElementById('visualizer')
  if (canvas) {
    canvas.classList.toggle('fullscreen', fullscreen)
  }

  // Update URL without reload if requested
  if (updateUrl) {
    setHashParam('shader', shaderPath)
  }

  return { code, fullscreen }
}

/**
 * Get fragment shader from URL params, localStorage, or default
 * @returns {Promise<{code: string, fullscreen: boolean}>}
 */
export const getInitialShader = async () => {
  const params = getHashParams()

  // Check for inline shader code first
  if (params.get('shaderCode')) {
    const code = decodeURIComponent(params.get('shaderCode'))
    const fullscreen = code.includes('@fullscreen: true')
    return { code, fullscreen }
  }

  // Check for shader path in URL
  const shaderPath = params.get('shader')
  if (shaderPath) {
    return loadShader(shaderPath)
  }

  // Check localStorage
  const localShader = localStorage.getItem('cranes-manual-code')
  if (localShader) {
    const fullscreen = localShader.includes('@fullscreen: true')
    return { code: localShader, fullscreen }
  }

  // Fall back to default
  return loadShader('default')
}
