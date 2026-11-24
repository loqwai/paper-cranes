import { getRelativeOrAbsoluteShaderUrl, looksLikeWebPage } from './utils.js'

/**
 * The shader on screen now, by path. Read it at the moment you need it, never once at boot: a
 * remote set_shader (loadShader with updateUrl) switches the page in place and rewrites ?shader=.
 * @returns {string|null}
 */
export const shaderOnScreen = () => new URLSearchParams(window.location.search).get('shader')

/**
 * Load a shader and apply all associated side effects
 * @param {string} shaderPath - Path to shader or full URL
 * @param {Object} options - Options
 * @param {boolean} options.updateUrl - Whether to update browser URL (default: false)
 * @returns {Promise<{code: string, fullscreen: boolean}>}
 */
export const loadShader = async (shaderPath, { updateUrl = false } = {}) => {
  const code = await getRelativeOrAbsoluteShaderUrl(shaderPath)
  // Checked here too, not only in the fetch helper: a boot-time prefetch (PR #223) can hand back
  // the body without going through that helper's checks.
  if (looksLikeWebPage(code)) throw new Error(`shader ${shaderPath} not found (the host sent a web page)`)

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
    const url = new URL(window.location)
    url.searchParams.set('shader', shaderPath)
    window.history.replaceState({}, '', url)
  }

  return { code, fullscreen }
}

// URLSearchParams has already decoded the value once. The second decode is kept for links that
// were encoded twice, but GLSL's `%` operator makes it throw (URIError), which killed the boot.
const decodeShaderCode = (code) => {
  try {
    return decodeURIComponent(code)
  } catch {
    return code
  }
}

/**
 * A link to a shader this host does not have (#207) must not be a silent black screen.
 * A small corner note says which shader is missing while the default one plays.
 * @param {string} shaderPath
 */
const showShaderMissing = (shaderPath) => {
  const note = document.createElement('div')
  note.setAttribute('role', 'status')
  note.textContent = `shader not found: ${shaderPath}`
  Object.assign(note.style, {
    position: 'fixed', left: '8px', bottom: '8px', zIndex: '9999', padding: '4px 8px',
    font: '12px system-ui, sans-serif', color: '#fff', background: 'rgba(160, 0, 0, 0.75)',
    borderRadius: '4px', pointerEvents: 'none',
  })
  document.body.appendChild(note)
}

/**
 * Get fragment shader from URL params, localStorage, or default
 * @returns {Promise<{code: string, fullscreen: boolean}>}
 */
export const getInitialShader = async () => {
  const params = new URLSearchParams(window.location.search)

  // Check for inline shader code first
  if (params.get('shaderCode')) {
    const code = decodeShaderCode(params.get('shaderCode'))
    const fullscreen = code.includes('@fullscreen: true')
    return { code, fullscreen }
  }

  // Check for shader path in URL
  const shaderPath = params.get('shader')
  if (shaderPath) {
    try {
      return await loadShader(shaderPath)
    } catch (error) {
      console.error(`[cranes] ${error.message}; showing the default shader instead`)
      showShaderMissing(shaderPath)
      return loadShader('default')
    }
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
