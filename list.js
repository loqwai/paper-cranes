import { render } from 'preact'
import { useState, useEffect, useRef, useMemo } from 'preact/hooks'
import { html } from 'htm/preact'

// Check if we're in remote control mode
const params = new URLSearchParams(window.location.search)
const isRemoteControlMode = params.get('remote') === 'control'

// Remote controller instance (initialized in List component)
let remoteController = null

// Params that are list-page UI state — should NOT forward to shader URLs.
// Everything else on the current URL gets forwarded; target params win on conflict.
const LIST_UI_PARAMS = new Set([
  'filter',
  'favoritesOnly',
  'fullscreenOnly',
  'wip',
  'sort',
  'tags',
  'notags',
  'mobileOnly',
])

const carryPassthroughParams = (url) => {
  const current = new URLSearchParams(window.location.search)
  for (const [key, value] of current) {
    // Never let the current page clobber the preset's CONTROLLER CHAIN.
    if (LIST_UI_PARAMS.has(key) || key === 'controller') continue
    url.searchParams.set(key, value) // current URL wins over target/preset
  }
  return url
}

/**
 * Controllers chain: repeated `?controller=` is a left-fold pipeline, so the
 * duplicate keys are meaningful. `URLSearchParams.set()` collapses them, which
 * silently drops e.g. lattice-nav and breaks panning. Anything that rebuilds a
 * shader URL has to append the chain, never set it.
 */
const setControllerChain = (url, controllers) => {
  url.searchParams.delete('controller')
  controllers.forEach((controller) => url.searchParams.append('controller', controller))
}

// ---------------------------------------------------------------------------
// Local memory
//
// Everything the performer marks at a party (stars, tags, what got played,
// the knob/image tweaks) lives in localStorage, deliberately:
//   - At a party he is on the deployed static site from a phone. There is no
//     server to write to and no build step to run, so a file write is not an
//     option at the moment he wants to tag something.
//   - The phone IS the performance device, so per-device storage is the right
//     scope. Build-time `@tags` / `@favorite` in the .frag stay the permanent,
//     shareable, in-repo truth; these merge on top of them.
// ---------------------------------------------------------------------------
const STORE_PREFIX = 'cranes-list'

const readStore = (key, fallback) => {
  try {
    const raw = localStorage.getItem(`${STORE_PREFIX}-${key}`)
    return raw === null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

const writeStore = (key, value) => {
  try {
    localStorage.setItem(`${STORE_PREFIX}-${key}`, JSON.stringify(value))
  } catch {
    // Private mode / quota — the page still works, it just forgets.
  }
}

// ---------------------------------------------------------------------------
// Search: forgiving on purpose. Punctuation, case, slashes and typo-ish gaps
// should never be the reason a shader is missing while people are watching.
// ---------------------------------------------------------------------------
const normalizeText = (text) => String(text).toLowerCase().replace(/[^a-z0-9]+/g, '')

const isSubsequence = (needle, haystack) => {
  let index = 0
  for (const char of haystack) {
    if (char === needle[index]) index++
    if (index === needle.length) return true
  }
  return needle.length === 0
}

const scoreTerm = (shader, term) => {
  const { normName, normPath, normTags } = shader.search
  if (normName.startsWith(term)) return 140
  if (normName.includes(term)) return 110
  if (normTags.some((tag) => tag === term)) return 100
  if (normTags.some((tag) => tag.includes(term))) return 80
  if (normPath.includes(term)) return 70
  if (isSubsequence(term, normName)) return 40
  if (isSubsequence(term, normPath)) return 25
  return 0
}

const queryTerms = (text) =>
  String(text)
    .split(/\s+/)
    .map(normalizeText)
    .filter(Boolean)

const scoreShader = (shader, terms) => {
  let total = 0
  for (const term of terms) {
    const score = scoreTerm(shader, term)
    if (score === 0) return 0 // every term must match something
    total += score
  }
  return total
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------
const timeAgo = (iso) => {
  if (!iso) return ''
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 18) return `${months}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

const folderOf = (name) => (name.includes('/') ? name.split('/')[0] : '(root)')

const FOLDER_PREFIX = 'folder:'

// ---------------------------------------------------------------------------
// URL building
// ---------------------------------------------------------------------------

/**
 * Creates a preset URL by combining the visualizer base URL with preset parameters
 * @param {string} visualizerUrl - Base visualizer URL
 * @param {string} line - Line containing a preset URL
 * @returns {string} Combined URL with merged parameters
 */
const getPresetUrl = (visualizerUrl, line) => {
  const presetUrlMatch = line.match(/https?:\/\/[^\s]+/)
  if (!presetUrlMatch) return visualizerUrl

  const presetUrl = new URL(presetUrlMatch[0])
  const baseUrl = new URL(visualizerUrl, window.location.href)
  const resultUrl = new URL(baseUrl.pathname, window.location.origin)

  // Preset params first, visualizer params override. SKIP `controller` here — `.set()` collapses
  // duplicate keys, which silently drops a chained controller (lattice-nav + lattice-controls →
  // just the last one) and breaks panning. The chain is reattached below with `.append()`.
  for (const [key, value] of presetUrl.searchParams) {
    if (key === 'controller') continue
    resultUrl.searchParams.set(key, value)
  }
  for (const [key, value] of baseUrl.searchParams) {
    if (key === 'controller') continue
    resultUrl.searchParams.set(key, value)
  }

  // Reattach the controller CHAIN in order, preserving duplicates. Visualizer wins if it declares
  // its own controllers; otherwise the preset's full pipeline is kept.
  const baseControllers = baseUrl.searchParams.getAll('controller')
  const controllers = baseControllers.length ? baseControllers : presetUrl.searchParams.getAll('controller')
  controllers.forEach((controller) => resultUrl.searchParams.append('controller', controller))

  resultUrl.pathname = ''

  return resultUrl.toString()
}

const getEditUrl = (visualizationUrl) => {
  try {
    const trimmed = visualizationUrl.startsWith('/') ? visualizationUrl.slice(1) : visualizationUrl
    const url = new URL(trimmed, window.location.origin)
    url.pathname = '/edit.html'
    carryPassthroughParams(url)
    return url.toString()
  } catch {
    return `edit.html${visualizationUrl}`
  }
}

/**
 * Builds the URL a shader actually opens with.
 *
 * Note: knob params are deliberately NOT stripped here. The old page stripped
 * them when opening fullscreen, which silently threw away the tuning of every
 * preset (and would throw away remembered knobs too). Stripping now only
 * happens for the explicit "copy a clean link" action.
 *
 * @param {Object} shader
 * @param {Object} options
 * @param {string} [options.preset] - a resolved preset URL to use as the base
 * @param {Object} [options.saved] - remembered params for this shader
 * @param {boolean} [options.fullscreen]
 * @returns {string}
 */
const buildShaderUrl = (shader, { preset, saved, fullscreen } = {}) => {
  const url = new URL(preset || shader.visualizerUrl, window.location.origin)

  // Remembered settings win over the preset: they are what he last had on
  // screen, including anything he hand-edited into the URL.
  if (saved) {
    const savedParams = new URLSearchParams(saved)
    for (const [key, value] of savedParams) {
      if (key === 'controller') continue
      url.searchParams.set(key, value)
    }
    // A remembered chain replaces the preset's chain wholesale — it is the
    // pipeline he last actually had running.
    const savedControllers = savedParams.getAll('controller')
    if (savedControllers.length) setControllerChain(url, savedControllers)
  }

  if (fullscreen) url.searchParams.set('fullscreen', 'true')

  // Historic behaviour: shaders that sample a texture expect one to be present.
  if (!url.searchParams.has('image')) {
    url.searchParams.set('image', 'images/rezz-full-lips-cropped.png')
  }

  url.searchParams.set('shader', shader.name)
  carryPassthroughParams(url)
  return url.toString()
}

/** Strips knob params — for sharing a link that starts from the shader's own defaults. */
const stripKnobs = (rawUrl) => {
  const url = new URL(rawUrl, window.location.origin)
  for (const key of [...url.searchParams.keys()]) {
    if (key.toLowerCase().includes('knob')) url.searchParams.delete(key)
  }
  return url.toString()
}

/** Params worth remembering from a URL the performer was actually looking at. */
const worthRemembering = (search) => {
  const source = new URLSearchParams(search)
  const kept = new URLSearchParams()
  for (const [key, value] of source) {
    if (key === 'shader' || key === 'fullscreen') continue
    if (LIST_UI_PARAMS.has(key)) continue
    if (key === 'remote' || key === 'room') continue
    // Keep the whole controller pipeline, not just its last stage.
    if (key === 'controller') {
      kept.append(key, value)
      continue
    }
    kept.set(key, value)
  }
  return kept.toString()
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
const shaders = await fetch('/shaders.json').then((res) => res.json())
const imageLibrary = await fetch('/images.json')
  .then((res) => (res.ok ? res.json() : []))
  .catch(() => [])

/**
 * Connection status banner for remote control mode
 */
const ConnectionStatus = ({ status, connectedClients, onRetry }) => {
  if (!isRemoteControlMode) return null

  const statusConfig = {
    connected: { bg: '#22c55e', text: `Connected (${connectedClients} clients)`, icon: '🟢' },
    disconnected: { bg: '#ef4444', text: 'Disconnected - tap to retry', icon: '🔴' },
    reconnecting: { bg: '#eab308', text: 'Reconnecting...', icon: '🟡' },
    error: { bg: '#ef4444', text: 'Connection error', icon: '🔴' },
  }

  const config = statusConfig[status] || statusConfig.disconnected
  const isClickable = status === 'disconnected' || status === 'error'

  return html`
    <div
      class="connection-status"
      style=${{
        backgroundColor: config.bg,
        color: 'white',
        padding: '12px 16px',
        textAlign: 'center',
        cursor: isClickable ? 'pointer' : 'default',
        fontWeight: 'bold',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
      onClick=${isClickable ? onRetry : null}
    >
      ${config.icon} Remote Control: ${config.text}
    </div>
  `
}

/**
 * One shader row. The whole middle is one big target: tap it and the thing is
 * on screen. Star / add-to-set / peek sit either side as separate 52px targets.
 */
const ShaderRow = ({
  shader,
  isStarred,
  inSet,
  savedParams,
  onOpen,
  onToggleStar,
  onToggleSet,
  onPeek,
  onCopy,
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const presetUrls = shader.presetUrls
  const hasPresets = presetUrls.length > 0
  const target = hasPresets ? presetUrls[0] : shader.visualizerUrl
  const href = buildShaderUrl(shader, { preset: hasPresets ? target : null, saved: savedParams })
  const visibleTags = shader.allTags.slice(0, 2)

  return html`
    <li>
      <div class="main-link">
        <button
          class=${`row-star ${isStarred ? 'on' : ''}`}
          onClick=${() => onToggleStar(shader)}
          title="Favourite"
          aria-label="Favourite"
        >★</button>
        <a
          class="row-body"
          href=${href}
          onClick=${(e) => {
            e.preventDefault()
            onOpen(shader, target)
          }}
        >
          <div class="row-name">${shader.prettyName || shader.name}</div>
          <div class="row-meta">
            <span>${timeAgo(shader.modified)}</span>
            ${visibleTags.map((tag) => html`<span class="dot">·</span><span class="tag">${tag}</span>`)}
            ${savedParams ? html`<span class="dot">·</span><span class="badge-saved">saved</span>` : null}
          </div>
        </a>
        <div class="row-actions">
          <button
            class=${`row-btn presets ${hasPresets ? '' : 'none'}`}
            onClick=${() => setIsExpanded(!isExpanded)}
            title="Presets"
          >${isExpanded ? '▾' : '▸'}${hasPresets ? presetUrls.length : ''}</button>
          <button
            class=${`row-btn ${inSet ? 'in-set' : ''}`}
            onClick=${() => onToggleSet(shader)}
            title=${inSet ? 'Remove from set' : 'Add to set'}
          >${inSet ? '✓' : '+'}</button>
          <button class="row-btn" onClick=${() => onPeek(shader)} title="Peek">▶</button>
          <button class="row-btn edit-link" onClick=${() => onCopy(href)} title="Copy clean link">⧉</button>
          <a
            class="row-btn edit-link"
            href=${getEditUrl(href)}
            onClick=${(e) => e.stopPropagation()}
          >edit</a>
        </div>
      </div>
      ${hasPresets && isExpanded
        ? html`
          <ul class="preset-list">
            ${presetUrls.map((preset, index) => html`
              <li>
                <button class="preset-link" onClick=${() => onOpen(shader, preset)}>
                  <span>${new URL(preset).searchParams.get('name') || `Preset ${index + 1}`}</span>
                  <span>▶</span>
                </button>
              </li>
            `)}
          </ul>
        `
        : null}
    </li>
  `
}

/**
 * Perform overlay — the answer to "one tap to the next thing".
 *
 * The shader runs in a same-origin iframe so the list never unloads: NEXT is a
 * single tap instead of back-scroll-find-tap. This is also why there are no
 * static thumbnails: these are motion pieces, and a live peek costs no assets.
 */
const PerformOverlay = ({
  queue,
  index,
  savedFor,
  onIndexChange,
  onClose,
  onOpenForReal,
  onRoll,
  onSaveParams,
  onToggleStar,
  isStarred,
  userTagsFor,
  onToggleUserTag,
  knownTags,
}) => {
  const [drawer, setDrawer] = useState(null)
  const [newTag, setNewTag] = useState('')
  const shader = queue[index]

  if (!shader) return null

  const saved = savedFor(shader.name)
  const src = buildShaderUrl(shader, {
    preset: shader.presetUrls[0] || null,
    saved,
    fullscreen: true,
  })
  const currentImage = new URL(src, window.location.origin).searchParams.get('image')
  const myTags = userTagsFor(shader.name)

  const setImage = (imageUrl) => {
    const next = new URLSearchParams(saved || '')
    next.set('image', imageUrl)
    onSaveParams(shader.name, next.toString())
  }

  const addTag = () => {
    const tag = normalizeText(newTag)
    if (!tag) return
    onToggleUserTag(shader.name, tag, true)
    setNewTag('')
  }

  return html`
    <div class="perform">
      <iframe
        key=${src}
        src=${src}
        title=${shader.prettyName}
        allow="microphone; camera; display-capture; autoplay; fullscreen; xr-spatial-tracking"
      ></iframe>
      <div class="perform-title">
        ${queue.length > 1 ? html`<span class="pos">${index + 1}/${queue.length}</span> ` : null}
        ${shader.prettyName} <span style=${{ opacity: 0.55 }}>${shader.name}</span>
      </div>

      ${drawer === 'image'
        ? html`
          <div class="perform-drawer">
            <div class="hint">Tap a texture — this replaces hand-editing <code>?image=</code> and is remembered for this shader.</div>
            <div class="image-grid">
              ${imageLibrary.map(
                (image) => html`
                  <button
                    class=${currentImage === image.url ? 'on' : ''}
                    onClick=${() => setImage(image.url)}
                  >
                    <img src=${`/${image.url}`} alt=${image.name} loading="lazy" />
                    <span class="cap">${image.name}</span>
                  </button>
                `
              )}
            </div>
            ${saved
              ? html`<button class="ghost-action" onClick=${() => onSaveParams(shader.name, '')}>
                  Forget saved settings for this shader
                </button>`
              : null}
          </div>
        `
        : null}

      ${drawer === 'tags'
        ? html`
          <div class="perform-drawer">
            <div class="tag-input-row">
              <input
                value=${newTag}
                placeholder="new tag…"
                onInput=${(e) => setNewTag(e.target.value)}
                onKeyDown=${(e) => e.key === 'Enter' && addTag()}
              />
              <button onClick=${addTag}>Add</button>
            </div>
            <div class="hint">Your tags are saved on this device. Tags written in the .frag (<code>// @tags:</code>) show without the blue ring.</div>
            <div class="tag-grid">
              ${[...new Set([...knownTags, ...myTags])].map((tag) => {
                const on = myTags.includes(tag)
                const fromFile = (shader.tags || []).includes(tag)
                return html`
                  <button
                    class=${`tag-chip ${on || fromFile ? 'include' : ''} ${on ? 'mine' : ''}`}
                    onClick=${() => onToggleUserTag(shader.name, tag, !on)}
                  >${tag}</button>
                `
              })}
            </div>
          </div>
        `
        : null}

      <div class="perform-bar">
        <button onClick=${() => onIndexChange(index - 1)} disabled=${index === 0}>
          <span class="glyph" style=${{ opacity: index === 0 ? 0.3 : 1 }}>⟨</span>
          <span class="label">Prev</span>
        </button>
        <button class=${isStarred(shader.name) ? 'on' : ''} onClick=${() => onToggleStar(shader)}>
          <span class="glyph">★</span>
          <span class="label">Fav</span>
        </button>
        <button class=${drawer === 'tags' ? 'on' : ''} onClick=${() => setDrawer(drawer === 'tags' ? null : 'tags')}>
          <span class="glyph">#</span>
          <span class="label">Tag</span>
        </button>
        <button class=${drawer === 'image' ? 'on' : ''} onClick=${() => setDrawer(drawer === 'image' ? null : 'image')}>
          <span class="glyph">🖼</span>
          <span class="label">Image</span>
        </button>
        <button onClick=${onRoll}>
          <span class="glyph">🎲</span>
          <span class="label">Roll</span>
        </button>
        <button class="wide" onClick=${() => onOpenForReal(shader)}>
          <span class="glyph">⤢</span>
          <span class="label">${isRemoteControlMode ? 'Send' : 'Open'}</span>
        </button>
        <button onClick=${() => onIndexChange(index + 1)} disabled=${index >= queue.length - 1}>
          <span class="glyph" style=${{ opacity: index >= queue.length - 1 ? 0.3 : 1 }}>⟩</span>
          <span class="label">Next</span>
        </button>
        <button onClick=${onClose}>
          <span class="glyph">✕</span>
          <span class="label">Close</span>
        </button>
      </div>
    </div>
  `
}

const addTo = (set, value) => new Set([...set, value])
const removeFrom = (set, value) => new Set([...set].filter((entry) => entry !== value))

/** Deterministic per-seed shuffle key so a shuffled list stays stable while scrolling. */
const hashSeed = (text, seed) => {
  let hash = Math.floor(seed * 1e9) >>> 0
  for (let index = 0; index < text.length; index++) {
    hash = (hash ^ text.charCodeAt(index)) * 16777619
    hash >>>= 0
  }
  return hash
}

const SORT_MODES = [
  { id: 'modified', glyph: '🕒', label: 'Newest first', sub: 'Most recently edited shader at the top' },
  { id: 'shown', glyph: '↺', label: 'Recently shown', sub: 'What you played most recently' },
  { id: 'name', glyph: 'A', label: 'A → Z', sub: 'Alphabetical by path' },
  { id: 'random', glyph: '🔀', label: 'Shuffled', sub: 'Tap again to reshuffle' },
]

const List = () => {
  const url = new URL(window.location)
  const prefs = readStore('prefs', {})

  const [filterText, setFilterText] = useState(url.searchParams.get('filter') || '')
  const [sortMode, setSortMode] = useState(url.searchParams.get('sort') || prefs.sort || 'modified')
  const [shuffleSeed, setShuffleSeed] = useState(1)
  const [favoritesOnly, setFavoritesOnly] = useState(url.searchParams.get('favoritesOnly') === 'true')
  const [mobileOnly, setMobileOnly] = useState(url.searchParams.get('mobileOnly') === 'true')
  const [showWip, setShowWip] = useState(url.searchParams.get('wip') === 'true')
  const [includeTags, setIncludeTags] = useState(
    () => new Set((url.searchParams.get('tags') || '').split(',').filter(Boolean))
  )
  const [excludeTags, setExcludeTags] = useState(
    () => new Set((url.searchParams.get('notags') || '').split(',').filter(Boolean))
  )

  const [stars, setStars] = useState(() => readStore('stars', []))
  const [userTags, setUserTags] = useState(() => readStore('usertags', {}))
  const [recents, setRecents] = useState(() => readStore('recents', {}))
  const [savedParams, setSavedParams] = useState(() => readStore('params', {}))
  const [setList, setSetList] = useState(() => readStore('set', []))
  const [fullscreenOnTap, setFullscreenOnTap] = useState(prefs.fullscreenOnTap !== false)

  const [sheet, setSheet] = useState(null)
  const [perform, setPerform] = useState(null)
  const [toast, setToast] = useState('')

  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const [connectedClients, setConnectedClients] = useState(0)
  const controllerRef = useRef(null)
  const searchRef = useRef(null)
  const toastTimer = useRef(null)

  const flash = (message) => {
    setToast(message)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 1400)
  }

  // Initialize remote controller
  useEffect(() => {
    if (!isRemoteControlMode) return

    const initController = async () => {
      const { initRemoteController } = await import('./src/remote/RemoteController.js')
      controllerRef.current = initRemoteController((status, data) => {
        setConnectionStatus(status)
        if (data?.connectedClients !== undefined) setConnectedClients(data.connectedClients)
      })
      remoteController = controllerRef.current
    }

    initController()
    return () => controllerRef.current?.disconnect()
  }, [])

  // Coming back from a shader page: the referrer still holds every param he
  // hand-edited over there, so capture it as this shader's remembered setup.
  // This is the "reopen exactly as last time" affordance, earned for free.
  useEffect(() => {
    if (!document.referrer) return
    let referrer
    try {
      referrer = new URL(document.referrer)
    } catch {
      return
    }
    if (referrer.origin !== window.location.origin) return
    const shaderName = referrer.searchParams.get('shader')
    if (!shaderName) return

    const remembered = worthRemembering(referrer.search)
    setSavedParams((previous) => {
      if (previous[shaderName] === remembered) return previous
      const next = { ...previous, [shaderName]: remembered }
      writeStore('params', next)
      return next
    })
    setRecents((previous) => {
      const next = { ...previous, [shaderName]: { t: Date.now(), n: (previous[shaderName]?.n || 0) + 1 } }
      writeStore('recents', next)
      return next
    })
  }, [])

  // Restore scroll position — losing your place in a 345 row list mid-set is
  // its own small disaster.
  useEffect(() => {
    const saved = readStore('scroll', 0)
    if (saved > 0) requestAnimationFrame(() => window.scrollTo(0, saved))

    let queued = false
    const onScroll = () => {
      if (queued) return
      queued = true
      requestAnimationFrame(() => {
        queued = false
        writeStore('scroll', window.scrollY)
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Keep the URL shareable/reloadable
  useEffect(() => {
    const next = new URL(window.location)
    const apply = (key, value) => (value ? next.searchParams.set(key, value) : next.searchParams.delete(key))
    apply('filter', filterText)
    apply('sort', sortMode === 'modified' ? '' : sortMode)
    apply('favoritesOnly', favoritesOnly ? 'true' : '')
    apply('mobileOnly', mobileOnly ? 'true' : '')
    apply('wip', showWip ? 'true' : '')
    apply('tags', [...includeTags].join(','))
    apply('notags', [...excludeTags].join(','))
    window.history.replaceState({}, '', next)
  }, [filterText, sortMode, favoritesOnly, mobileOnly, showWip, includeTags, excludeTags])

  useEffect(() => {
    writeStore('prefs', { sort: sortMode, fullscreenOnTap })
  }, [sortMode, fullscreenOnTap])

  // Opening Find should put the cursor in the box — never a second tap.
  useEffect(() => {
    if (sheet !== 'search') return
    requestAnimationFrame(() => searchRef.current?.focus())
  }, [sheet])

  // Augment the build-time data with everything stored on this device
  const augmented = useMemo(() => {
    const starSet = new Set(stars)
    return shaders.map((shader) => {
      const fileTags = shader.tags || []
      const mine = userTags[shader.name] || []
      const allTags = [...new Set([...fileTags, ...mine])]
      return {
        ...shader,
        prettyName: shader.prettyName || shader.name,
        tags: fileTags,
        myTags: mine,
        allTags,
        folder: folderOf(shader.name),
        isStarred: starSet.has(shader.name) || shader.favorite === true,
        presetUrls: (shader.presets || []).map((preset) => getPresetUrl(shader.visualizerUrl, preset)),
        search: {
          normName: normalizeText(shader.prettyName || shader.name),
          normPath: normalizeText(shader.name),
          normTags: allTags.map(normalizeText),
        },
      }
    })
  }, [stars, userTags])

  // Base pool: WIP / favourites / mobile. Tag chip counts come from here so the
  // numbers on the chips always describe what tapping them will actually do.
  const pool = useMemo(() => {
    let list = augmented
    if (!showWip) list = list.filter((shader) => !shader.name.includes('wip'))
    if (favoritesOnly) list = list.filter((shader) => shader.isStarred)
    if (mobileOnly) list = list.filter((shader) => shader.mobile === true)
    return list
  }, [augmented, showWip, favoritesOnly, mobileOnly])

  const tagCounts = useMemo(() => {
    const tags = new Map()
    const folders = new Map()
    for (const shader of pool) {
      for (const tag of shader.allTags) tags.set(tag, (tags.get(tag) || 0) + 1)
      folders.set(shader.folder, (folders.get(shader.folder) || 0) + 1)
    }
    return {
      tags: [...tags.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
      folders: [...folders.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
    }
  }, [pool])

  const visible = useMemo(() => {
    const terms = queryTerms(filterText)
    let list = pool

    if (includeTags.size > 0) {
      // OR, not AND: at a party "kandi or taco" is the useful question.
      list = list.filter((shader) =>
        [...includeTags].some((tag) =>
          tag.startsWith(FOLDER_PREFIX) ? shader.folder === tag.slice(FOLDER_PREFIX.length) : shader.allTags.includes(tag)
        )
      )
    }

    if (excludeTags.size > 0) {
      list = list.filter((shader) =>
        ![...excludeTags].some((tag) =>
          tag.startsWith(FOLDER_PREFIX) ? shader.folder === tag.slice(FOLDER_PREFIX.length) : shader.allTags.includes(tag)
        )
      )
    }

    if (terms.length > 0) {
      list = list
        .map((shader) => ({ shader, score: scoreShader(shader, terms) }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((entry) => entry.shader)
      return list // relevance order beats any sort mode while searching
    }

    const sorted = [...list]
    if (sortMode === 'modified') {
      sorted.sort((a, b) => String(b.modified || '').localeCompare(String(a.modified || '')))
    } else if (sortMode === 'shown') {
      sorted.sort((a, b) => (recents[b.name]?.t || 0) - (recents[a.name]?.t || 0))
    } else if (sortMode === 'random') {
      sorted.sort((a, b) => hashSeed(a.name, shuffleSeed) - hashSeed(b.name, shuffleSeed))
    } else {
      sorted.sort((a, b) => a.name.localeCompare(b.name))
    }
    return sorted
  }, [pool, filterText, includeTags, excludeTags, sortMode, recents, shuffleSeed])

  // ---- actions -----------------------------------------------------------
  const persistRecent = (name) => {
    setRecents((previous) => {
      const next = { ...previous, [name]: { t: Date.now(), n: (previous[name]?.n || 0) + 1 } }
      writeStore('recents', next)
      return next
    })
  }

  const openShader = (shader, presetUrl) => {
    const saved = savedParams[shader.name] || ''
    const target = buildShaderUrl(shader, {
      preset: presetUrl && presetUrl !== shader.visualizerUrl ? presetUrl : null,
      saved,
      fullscreen: fullscreenOnTap,
    })
    persistRecent(shader.name)

    if (isRemoteControlMode && remoteController) {
      const sendable = Object.fromEntries(new URL(target).searchParams.entries())
      remoteController.sendParams(sendable)
      flash(`Sent ${shader.prettyName}`)
      return
    }

    navigator.clipboard?.writeText(target).catch(() => {})
    if (fullscreenOnTap) document.documentElement.requestFullscreen?.().catch(() => {})
    window.location.href = target
  }

  const toggleStar = (shader) => {
    setStars((previous) => {
      const next = previous.includes(shader.name)
        ? previous.filter((name) => name !== shader.name)
        : [...previous, shader.name]
      writeStore('stars', next)
      return next
    })
  }

  const toggleSet = (shader) => {
    setSetList((previous) => {
      const next = previous.includes(shader.name)
        ? previous.filter((name) => name !== shader.name)
        : [...previous, shader.name]
      writeStore('set', next)
      flash(previous.includes(shader.name) ? 'Removed from set' : `Set: ${next.length}`)
      return next
    })
  }

  const toggleUserTag = (name, tag, on) => {
    setUserTags((previous) => {
      const mine = previous[name] || []
      const nextTags = on ? [...new Set([...mine, tag])] : mine.filter((existing) => existing !== tag)
      const next = { ...previous, [name]: nextTags }
      if (nextTags.length === 0) delete next[name]
      writeStore('usertags', next)
      return next
    })
  }

  const saveParamsFor = (name, search) => {
    setSavedParams((previous) => {
      const next = { ...previous }
      if (search) next[name] = search
      else delete next[name]
      writeStore('params', next)
      return next
    })
  }

  const copyLink = (rawUrl) => {
    navigator.clipboard?.writeText(stripKnobs(rawUrl)).catch(() => {})
    flash('Link copied')
  }

  /** Weighted pick — favourites and untouched shaders float up, just-played sink. */
  const rollOne = (exclude = []) => {
    const candidates = visible.filter((shader) => !exclude.includes(shader.name))
    const pickFrom = candidates.length > 0 ? candidates : visible
    if (pickFrom.length === 0) return null

    const weights = pickFrom.map((shader) => {
      let weight = 1
      if (shader.isStarred) weight *= 3.5
      if (shader.allTags.length > 0) weight *= 1.4
      if (shader.mobile === true) weight *= 1.2
      const seen = recents[shader.name]
      if (!seen) weight *= 1.5
      else {
        const hours = (Date.now() - seen.t) / 3600000
        if (hours < 2) weight *= 0.04
        else if (hours < 24) weight *= 0.4
      }
      return weight
    })

    const total = weights.reduce((sum, weight) => sum + weight, 0)
    let ticket = Math.random() * total
    for (let index = 0; index < pickFrom.length; index++) {
      ticket -= weights[index]
      if (ticket <= 0) return pickFrom[index]
    }
    return pickFrom[pickFrom.length - 1]
  }

  const startPerform = (queue, index = 0) => {
    if (queue.length === 0) return
    setSheet(null)
    setPerform({ queue, index })
    persistRecent(queue[index].name)
  }

  const peek = (shader) => {
    const index = visible.findIndex((entry) => entry.name === shader.name)
    startPerform(visible, Math.max(0, index))
  }

  const roll = () => {
    const picked = rollOne()
    if (!picked) return flash('Nothing matches')
    startPerform([picked], 0)
  }

  const rollAgain = () => {
    setPerform((previous) => {
      if (!previous) return previous
      const picked = rollOne(previous.queue.map((shader) => shader.name))
      if (!picked) return previous
      persistRecent(picked.name)
      return { queue: [...previous.queue, picked], index: previous.queue.length }
    })
  }

  const clearAllFilters = () => {
    setFilterText('')
    setIncludeTags(new Set())
    setExcludeTags(new Set())
    setFavoritesOnly(false)
    setMobileOnly(false)
    flash('Filters cleared')
  }

  const cycleTag = (tag) => {
    if (includeTags.has(tag)) {
      setIncludeTags(removeFrom(includeTags, tag))
      setExcludeTags(addTo(excludeTags, tag))
      return
    }
    if (excludeTags.has(tag)) {
      setExcludeTags(removeFrom(excludeTags, tag))
      return
    }
    setIncludeTags(addTo(includeTags, tag))
  }

  const setShaders = setList
    .map((name) => augmented.find((shader) => shader.name === name))
    .filter(Boolean)

  const activeFilterCount =
    includeTags.size + excludeTags.size + (favoritesOnly ? 1 : 0) + (mobileOnly ? 1 : 0) + (filterText ? 1 : 0)

  const knownTags = useMemo(() => tagCounts.tags.map(([tag]) => tag), [tagCounts])

  return html`
    <div>
      <${ConnectionStatus}
        status=${connectionStatus}
        connectedClients=${connectedClients}
        onRetry=${() => controllerRef.current?.reconnect()}
      />

      <div class="status-strip">
        <span class="status-text">
          <b>${visible.length}</b> of ${augmented.length}
          ${filterText ? html` · "${filterText}"` : null}
          ${includeTags.size ? html` · ${[...includeTags].join(', ')}` : null}
          ${excludeTags.size ? html` · not ${[...excludeTags].join(', ')}` : null}
          ${favoritesOnly ? ' · favourites' : ''}
          ${mobileOnly ? ' · mobile' : ''}
        </span>
        ${activeFilterCount > 0
          ? html`<button class="clear-all" onClick=${clearAllFilters}>Clear</button>`
          : null}
      </div>

      <ul class="shader-list">
        ${visible.map(
          (shader) => html`
            <${ShaderRow}
              key=${shader.name}
              shader=${shader}
              isStarred=${shader.isStarred}
              inSet=${setList.includes(shader.name)}
              savedParams=${savedParams[shader.name] || ''}
              onOpen=${openShader}
              onToggleStar=${toggleStar}
              onToggleSet=${toggleSet}
              onPeek=${peek}
              onCopy=${copyLink}
            />
          `
        )}
      </ul>

      ${visible.length === 0
        ? html`<div class="empty">Nothing matches. Tap <b>Clear</b> up top.</div>`
        : null}

      <div class="bottom-bar">
        <button
          class=${`bar-btn ${filterText ? 'active' : ''}`}
          onClick=${() => setSheet(sheet === 'search' ? null : 'search')}
        >
          <span class="glyph">🔍</span><span class="label">Find</span>
        </button>
        <button class="bar-btn" onClick=${() => setSheet(sheet === 'sort' ? null : 'sort')}>
          <span class="glyph">⇅</span>
          <span class="label">${SORT_MODES.find((mode) => mode.id === sortMode)?.label.split(' ')[0] || 'Sort'}</span>
        </button>
        <button class=${`bar-btn ${favoritesOnly ? 'active' : ''}`} onClick=${() => setFavoritesOnly(!favoritesOnly)}>
          <span class="glyph">★</span><span class="label">Favs</span>
        </button>
        <button
          class=${`bar-btn ${includeTags.size || excludeTags.size ? 'active' : ''}`}
          onClick=${() => setSheet(sheet === 'tags' ? null : 'tags')}
        >
          <span class="glyph">#</span><span class="label">Tags</span>
          ${includeTags.size + excludeTags.size > 0
            ? html`<span class="count">${includeTags.size + excludeTags.size}</span>`
            : null}
        </button>
        <button class="bar-btn" onClick=${() => setSheet(sheet === 'set' ? null : 'set')}>
          <span class="glyph">▤</span><span class="label">Set</span>
          ${setList.length > 0 ? html`<span class="count">${setList.length}</span>` : null}
        </button>
        <button class="bar-btn" onClick=${roll}>
          <span class="glyph">🎲</span><span class="label">Roll</span>
        </button>
      </div>

      ${sheet
        ? html`
          <div class="sheet-backdrop" onClick=${() => setSheet(null)}></div>
          <div class="sheet">
            <div class="sheet-head">
              <span class="sheet-title">
                ${sheet === 'search' ? 'Find' : sheet === 'sort' ? 'Sort & show' : sheet === 'tags' ? 'Tags' : 'Setlist'}
              </span>
              <button class="sheet-close" onClick=${() => setSheet(null)}>✕</button>
            </div>
            <div class="sheet-body">
              ${sheet === 'search'
                ? html`
                  <input
                    ref=${searchRef}
                    class="search-input"
                    type="search"
                    placeholder="name, tag, folder…"
                    value=${filterText}
                    onInput=${(e) => setFilterText(e.target.value)}
                  />
                  <div class="hint">Matches names, tags and folders. Punctuation and case are ignored, and letters can be skipped — "chrmdpth" finds chromadepth.</div>
                  ${filterText
                    ? html`<button class="ghost-action" onClick=${() => setFilterText('')}>Clear search</button>`
                    : null}
                `
                : null}

              ${sheet === 'sort'
                ? html`
                  ${SORT_MODES.map(
                    (mode) => html`
                      <button
                        class=${`option ${sortMode === mode.id ? 'on' : ''}`}
                        onClick=${() => {
                          setSortMode(mode.id)
                          if (mode.id === 'random') setShuffleSeed(Math.random())
                        }}
                      >
                        <span class="glyph">${mode.glyph}</span>
                        <span>${mode.label}<span class="sub">${mode.sub}</span></span>
                      </button>
                    `
                  )}
                  <div class="hint">Show</div>
                  <button class=${`option ${showWip ? 'on' : ''}`} onClick=${() => setShowWip(!showWip)}>
                    <span class="glyph">🧪</span>
                    <span>Include WIP<span class="sub">Work-in-progress shaders (${augmented.filter((shader) => shader.name.includes('wip')).length})</span></span>
                  </button>
                  <button class=${`option ${mobileOnly ? 'on' : ''}`} onClick=${() => setMobileOnly(!mobileOnly)}>
                    <span class="glyph">📱</span>
                    <span>Mobile-safe only<span class="sub">Marked <code>@mobile: true</code> (${augmented.filter((shader) => shader.mobile === true).length})</span></span>
                  </button>
                  <button
                    class=${`option ${fullscreenOnTap ? 'on' : ''}`}
                    onClick=${() => setFullscreenOnTap(!fullscreenOnTap)}
                  >
                    <span class="glyph">⤢</span>
                    <span>Open fullscreen on tap<span class="sub">Skip the extra fullscreen tap when showing someone</span></span>
                  </button>
                `
                : null}

              ${sheet === 'tags'
                ? html`
                  <div class="hint">Tap once to keep only that tag, again to hide it, again to reset.</div>
                  <div class="tag-grid">
                    ${tagCounts.tags.map(
                      ([tag, count]) => html`
                        <button
                          class=${`tag-chip ${includeTags.has(tag) ? 'include' : ''} ${excludeTags.has(tag) ? 'exclude' : ''} ${Object.values(userTags).some((list) => list.includes(tag)) ? 'mine' : ''}`}
                          onClick=${() => cycleTag(tag)}
                        >${tag}<span class="n">${count}</span></button>
                      `
                    )}
                  </div>
                  <div class="hint">Folders</div>
                  <div class="tag-grid">
                    ${tagCounts.folders.map(([folder, count]) => {
                      const id = `${FOLDER_PREFIX}${folder}`
                      return html`
                        <button
                          class=${`tag-chip ${includeTags.has(id) ? 'include' : ''} ${excludeTags.has(id) ? 'exclude' : ''}`}
                          onClick=${() => cycleTag(id)}
                        >${folder}<span class="n">${count}</span></button>
                      `
                    })}
                  </div>
                `
                : null}

              ${sheet === 'set'
                ? html`
                  ${setShaders.length === 0
                    ? html`<div class="hint">Empty. Tap <b>+</b> on any shader to line it up, then hit GO and advance with one tap.</div>`
                    : null}
                  ${setShaders.map(
                    (shader, index) => html`
                      <div class="set-row">
                        <span class="pos">${index + 1}</span>
                        <span class="nm">${shader.prettyName}</span>
                        <button class="rm" onClick=${() => toggleSet(shader)}>✕</button>
                      </div>
                    `
                  )}
                  ${setShaders.length > 0
                    ? html`
                      <button class="big-action" onClick=${() => startPerform(setShaders, 0)}>▶ Go — play set</button>
                      <button
                        class="ghost-action"
                        onClick=${() => {
                          setSetList([])
                          writeStore('set', [])
                        }}
                      >Clear set</button>
                    `
                    : null}
                `
                : null}
            </div>
          </div>
        `
        : null}

      ${perform
        ? html`
          <${PerformOverlay}
            queue=${perform.queue}
            index=${perform.index}
            savedFor=${(name) => savedParams[name] || ''}
            onIndexChange=${(next) => {
              if (next < 0 || next >= perform.queue.length) return
              setPerform({ ...perform, index: next })
              persistRecent(perform.queue[next].name)
            }}
            onClose=${() => setPerform(null)}
            onOpenForReal=${(shader) => {
              setPerform(null)
              openShader(shader, shader.presetUrls[0])
            }}
            onRoll=${rollAgain}
            onSaveParams=${saveParamsFor}
            onToggleStar=${toggleStar}
            isStarred=${(name) => stars.includes(name) || shaders.find((s) => s.name === name)?.favorite === true}
            userTagsFor=${(name) => userTags[name] || []}
            onToggleUserTag=${toggleUserTag}
            knownTags=${knownTags}
          />
        `
        : null}

      ${toast ? html`<div class="toast">${toast}</div>` : null}
    </div>
  `
}

render(html`<${List} />`, document.getElementsByTagName('main')[0])

// Reload the page when shader files change on disk
if (import.meta.hot) {
  import.meta.hot.on('shaders-changed', () => {
    location.reload()
  })
}
