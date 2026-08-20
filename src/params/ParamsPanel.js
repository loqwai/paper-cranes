import { render, Fragment } from 'preact'
import { useState, useEffect, useCallback } from 'preact/hooks'
import { html } from 'htm/preact'
import {
    PARAM_SCHEMA,
    SETTINGS_ORDER,
    UNTOUCHABLE,
    LIVE,
    RELOAD,
    isKnobValue,
    isKnobRange,
    knobsUsedBy,
} from './paramSchema.js'

/**
 * ParamsPanel — edit the URL without touching the address bar.
 *
 * Mounts on the visualizer, which is the one page that had no param UI at all:
 * edit.js and jam.js each build their own, but index.js read URLSearchParams
 * once at load and never looked again.
 *
 * Live edits (knobs, smoothing) go through ParamsManager into
 * window.cranes.manualFeatures and land on the next frame. Edits that rebuild
 * the shader program or the audio graph are collected as `pending` and applied
 * as a single navigation, so changing a texture doesn't reload the page on
 * every keystroke.
 */

const LONG_PRESS_MS = 600

/**
 * Controller names, resolved at build time. Vite turns this glob into a static
 * map, so it costs nothing at runtime and needs no extra JSON artifact.
 * controllerChain.js loads them from `/controllers/<name>.js`.
 */
const AVAILABLE_CONTROLLERS = Object.keys(import.meta.glob('/controllers/*.js'))
    .map((path) => path.split('/').pop().replace(/\.js$/, ''))
    .filter((name) => name !== 'example')
    .sort()

/** Repeated `?controller=` is a pipeline, so it has to be read positionally. */
const readChain = () => new URLSearchParams(window.location.search).getAll('controller')

const writeChain = (url, chain) => {
    url.searchParams.delete('controller')
    for (const name of chain) url.searchParams.append('controller', name)
}

const numberish = (value) => {
    const n = parseFloat(value)
    return isNaN(n) ? value : n
}

const prettyNumber = (n) => {
    if (n === '' || n === null || n === undefined || isNaN(n)) return ''
    return Number.isInteger(n) ? n : parseFloat(Number(n).toFixed(4))
}

const copy = async (text, toast) => {
    try {
        await navigator.clipboard.writeText(text)
        toast('Copied')
    } catch {
        toast('Copy failed')
    }
}

/** A link that starts from the shader's own defaults, with the tuning dropped. */
const stripKnobs = (rawUrl) => {
    const url = new URL(rawUrl, window.location.origin)
    for (const key of [...url.searchParams.keys()]) {
        if (key.toLowerCase().includes('knob')) url.searchParams.delete(key)
    }
    return url.toString()
}

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

const KnobRow = ({ index, value, min, max, onValue, onRange, onReset, isSet }) => {
    const span = max - min || 1
    const step = span / 1000

    return html`
        <div class=${`pp-row pp-knob ${isSet ? 'pp-set' : ''}`}>
            <div class="pp-knob-head">
                <span class="pp-key">knob_${index}</span>
                <input
                    class="pp-num"
                    type="number"
                    value=${prettyNumber(value)}
                    step=${step}
                    onInput=${(e) => onValue(parseFloat(e.target.value))}
                />
                <button class="pp-mini" title="Reset to shader default" onClick=${onReset}>↺</button>
            </div>
            <input
                class="pp-slider"
                type="range"
                min=${min}
                max=${max}
                step=${step}
                value=${value}
                onInput=${(e) => onValue(parseFloat(e.target.value))}
            />
            <div class="pp-range">
                <input
                    class="pp-num pp-num-sm"
                    type="number"
                    value=${prettyNumber(min)}
                    onInput=${(e) => onRange('min', parseFloat(e.target.value))}
                />
                <span class="pp-range-label">range</span>
                <input
                    class="pp-num pp-num-sm"
                    type="number"
                    value=${prettyNumber(max)}
                    onInput=${(e) => onRange('max', parseFloat(e.target.value))}
                />
            </div>
        </div>
    `
}

const PickerRow = ({ label, value, options, filter, onPick, onClear, pending }) => {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')

    const shown = query
        ? options.filter((o) => filter(o, query.toLowerCase()))
        : options.slice(0, 60)

    return html`
        <div class=${`pp-row ${pending ? 'pp-pending' : ''}`}>
            <div class="pp-row-head">
                <span class="pp-key">${label}</span>
                <button class="pp-value-btn" onClick=${() => setOpen(!open)}>
                    ${value || html`<em>none</em>`}
                </button>
                ${value ? html`<button class="pp-mini" onClick=${onClear} title="Remove">×</button>` : null}
            </div>
            ${open
                ? html`
                      <div class="pp-picker">
                          <input
                              class="pp-search"
                              placeholder="filter…"
                              value=${query}
                              onInput=${(e) => setQuery(e.target.value)}
                              autofocus
                          />
                          <div class="pp-picker-list">
                              ${shown.map(
                                  (o) => html`
                                      <button
                                          class=${`pp-picker-item ${o.value === value ? 'pp-active' : ''}`}
                                          onClick=${() => {
                                              onPick(o.value)
                                              setOpen(false)
                                              setQuery('')
                                          }}
                                      >
                                          ${o.label}
                                      </button>
                                  `
                              )}
                              ${shown.length === 0 ? html`<div class="pp-empty">no matches</div>` : null}
                          </div>
                      </div>
                  `
                : null}
        </div>
    `
}

const ChainRow = ({ chain, available, onChange, pending }) => {
    const [adding, setAdding] = useState(false)

    const move = (i, delta) => {
        const next = [...chain]
        const j = i + delta
        if (j < 0 || j >= next.length) return
        ;[next[i], next[j]] = [next[j], next[i]]
        onChange(next)
    }

    return html`
        <div class=${`pp-row ${pending ? 'pp-pending' : ''}`}>
            <div class="pp-row-head">
                <span class="pp-key">controllers</span>
                <button class="pp-mini" onClick=${() => setAdding(!adding)} title="Add">+</button>
            </div>
            <div class="pp-hint">Runs left to right; the last stage wins on a key clash.</div>
            <div class="pp-chips">
                ${chain.map(
                    (name, i) => html`
                        <span class="pp-chip">
                            <button class="pp-chip-move" onClick=${() => move(i, -1)} disabled=${i === 0}>‹</button>
                            <span class="pp-chip-name">${name}</span>
                            <button
                                class="pp-chip-move"
                                onClick=${() => move(i, 1)}
                                disabled=${i === chain.length - 1}
                            >
                                ›
                            </button>
                            <button
                                class="pp-chip-x"
                                onClick=${() => onChange(chain.filter((_, j) => j !== i))}
                            >
                                ×
                            </button>
                        </span>
                    `
                )}
                ${chain.length === 0 ? html`<span class="pp-empty">none</span>` : null}
            </div>
            ${adding
                ? html`
                      <div class="pp-picker-list pp-inline">
                          ${available.map(
                              (name) => html`
                                  <button
                                      class="pp-picker-item"
                                      onClick=${() => {
                                          onChange([...chain, name])
                                          setAdding(false)
                                      }}
                                  >
                                      ${name}
                                  </button>
                              `
                          )}
                      </div>
                  `
                : null}
        </div>
    `
}

const SettingRow = ({ name, spec, value, onChange, onClear, pending }) => {
    const label = spec.label ?? name

    if (spec.control === 'toggle') {
        const on = value === 'true' || value === true
        return html`
            <div class=${`pp-row pp-inline-row ${pending ? 'pp-pending' : ''}`}>
                <span class="pp-key">${label}</span>
                <button
                    class=${`pp-toggle ${on ? 'pp-on' : ''}`}
                    onClick=${() => (on ? onClear() : onChange('true'))}
                >
                    ${on ? 'on' : 'off'}
                </button>
            </div>
        `
    }

    if (spec.control === 'select') {
        return html`
            <div class=${`pp-row pp-inline-row ${pending ? 'pp-pending' : ''}`}>
                <span class="pp-key">${label}</span>
                <select
                    class="pp-select"
                    value=${value ?? ''}
                    onChange=${(e) => (e.target.value === '' ? onClear() : onChange(e.target.value))}
                >
                    ${spec.options.map((o) => html`<option value=${o}>${o === '' ? 'default' : o}</option>`)}
                </select>
            </div>
        `
    }

    if (spec.control === 'range') {
        // An unset slider shows the value the app actually runs at, greyed —
        // parking it at the slider minimum would read as "smoothing is 0.01".
        const isSet = value !== undefined && value !== ''
        const current = isSet ? Number(value) : spec.default
        return html`
            <div class=${`pp-row ${pending ? 'pp-pending' : ''} ${isSet ? '' : 'pp-unset'}`}>
                <div class="pp-row-head">
                    <span class="pp-key">${label}</span>
                    <input
                        class="pp-num"
                        type="number"
                        value=${prettyNumber(current)}
                        step=${spec.step}
                        title=${isSet ? '' : 'default'}
                        onInput=${(e) => onChange(e.target.value)}
                    />
                    ${isSet ? html`<button class="pp-mini" onClick=${onClear} title="Reset">↺</button>` : null}
                </div>
                <input
                    class="pp-slider"
                    type="range"
                    min=${spec.min}
                    max=${spec.max}
                    step=${spec.step}
                    value=${current}
                    onInput=${(e) => onChange(e.target.value)}
                />
            </div>
        `
    }

    return html`
        <div class=${`pp-row pp-inline-row ${pending ? 'pp-pending' : ''}`}>
            <span class="pp-key">${label}</span>
            <input
                class="pp-text"
                value=${value ?? ''}
                placeholder="unset"
                onInput=${(e) => (e.target.value === '' ? onClear() : onChange(e.target.value))}
            />
        </div>
    `
}

const OtherRow = ({ name, value, onChange, onRename, onDelete }) => {
    const [editingKey, setEditingKey] = useState(false)
    const [draftKey, setDraftKey] = useState(name)

    const commitKey = () => {
        setEditingKey(false)
        if (draftKey && draftKey !== name) onRename(name, draftKey)
        else setDraftKey(name)
    }

    return html`
        <div class="pp-row pp-inline-row">
            ${editingKey
                ? html`
                      <input
                          class="pp-text pp-key-edit"
                          value=${draftKey}
                          onInput=${(e) => setDraftKey(e.target.value)}
                          onBlur=${commitKey}
                          onKeyDown=${(e) => e.key === 'Enter' && commitKey()}
                          autofocus
                      />
                  `
                : html`<button class="pp-key pp-key-btn" onClick=${() => setEditingKey(true)}>${name}</button>`}
            <input class="pp-text" value=${value ?? ''} onInput=${(e) => onChange(name, e.target.value)} />
            <button class="pp-mini" onClick=${() => onDelete(name)} title="Delete">×</button>
        </div>
    `
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

const Panel = ({ paramsManager, toast, onClose }) => {
    const [params, setParams] = useState(() => paramsManager.getAll())
    const [pending, setPending] = useState({})
    const [chain, setChain] = useState(readChain)
    const [chainDirty, setChainDirty] = useState(false)
    const [shaderList, setShaderList] = useState([])
    const [imageList, setImageList] = useState([])
    const controllerList = AVAILABLE_CONTROLLERS
    const [tab, setTab] = useState('knobs')

    // Keep in step with MIDI, controllers, and anything else writing params.
    useEffect(() => paramsManager.subscribe(() => setParams(paramsManager.getAll())), [paramsManager])

    useEffect(() => {
        fetch('/shaders.json')
            .then((r) => r.json())
            .then((list) =>
                setShaderList(list.map((s) => ({ value: s.name, label: s.prettyName || s.name })))
            )
            .catch(() => {})
        fetch('/images.json')
            .then((r) => r.json())
            .then((list) =>
                setImageList(
                    list.map((i) => {
                        const value = typeof i === 'string' ? i : i.url || i.path || i.name
                        return { value, label: value.split('/').pop() }
                    })
                )
            )
            .catch(() => {})
    }, [])

    const knobs = knobsUsedBy(window.cranes?.shader ?? window.shader)

    const setLive = useCallback(
        (key, value) => {
            paramsManager.set(key, value)
            setParams(paramsManager.getAll())
        },
        [paramsManager]
    )

    const clearLive = useCallback(
        (key) => {
            paramsManager.delete(key)
            setParams(paramsManager.getAll())
        },
        [paramsManager]
    )

    const stageReload = (key, value) => setPending((p) => ({ ...p, [key]: value }))

    const effective = (key) => (key in pending ? pending[key] : params[key])

    const hasPending = Object.keys(pending).length > 0 || chainDirty

    const applyPending = () => {
        const url = new URL(window.location.href)
        for (const [key, value] of Object.entries(pending)) {
            if (value === null || value === undefined || value === '') url.searchParams.delete(key)
            else url.searchParams.set(key, value)
        }
        if (chainDirty) writeChain(url, chain)
        window.location.href = url.toString()
    }

    const currentUrl = () => {
        // ParamsManager syncs the URL on a debounce; rebuild it here so a copy
        // taken immediately after a slider move isn't one edit behind.
        const url = new URL(window.location.href)
        for (const [key, value] of Object.entries(params)) {
            if (value === null || value === undefined || value === '') url.searchParams.delete(key)
            else url.searchParams.set(key, value)
        }
        writeChain(url, chain)
        return url.toString()
    }

    const resetAll = () => {
        for (const key of Object.keys(params)) {
            if (isKnobValue(key) || isKnobRange(key)) paramsManager.delete(key)
        }
        setParams(paramsManager.getAll())
        toast('Knobs reset')
    }

    const otherKeys = Object.keys(params)
        .filter((k) => !isKnobValue(k) && !isKnobRange(k))
        .filter((k) => !(k in PARAM_SCHEMA))
        .filter((k) => !UNTOUCHABLE.has(k))
        .sort()

    const knobSection = html`
        <div class="pp-section">
            ${knobs.length === 0
                ? html`<div class="pp-empty pp-pad">This shader declares no knobs.</div>`
                : knobs.map((i) => {
                      const key = `knob_${i}`
                      const min = params[`${key}.min`] ?? 0
                      const max = params[`${key}.max`] ?? 1
                      const value = params[key] ?? min
                      return html`
                          <${KnobRow}
                              key=${key}
                              index=${i}
                              value=${Number(value)}
                              min=${Number(min)}
                              max=${Number(max)}
                              isSet=${key in params}
                              onValue=${(v) => setLive(key, v)}
                              onRange=${(which, v) => setLive(`${key}.${which}`, v)}
                              onReset=${() => {
                                  clearLive(key)
                                  clearLive(`${key}.min`)
                                  clearLive(`${key}.max`)
                              }}
                          />
                      `
                  })}
        </div>
    `

    const settingsSection = html`
        <div class="pp-section">
            ${SETTINGS_ORDER.map((name) => {
                const spec = PARAM_SCHEMA[name]
                if (!spec) return null
                const value = effective(name)
                const isPending = name in pending
                const change = spec.apply === LIVE ? (v) => setLive(name, numberish(v)) : (v) => stageReload(name, v)
                const clear = spec.apply === LIVE ? () => clearLive(name) : () => stageReload(name, '')

                if (name === 'controller') {
                    return html`
                        <${ChainRow}
                            key=${name}
                            chain=${chain}
                            available=${controllerList}
                            pending=${chainDirty}
                            onChange=${(next) => {
                                setChain(next)
                                setChainDirty(true)
                            }}
                        />
                    `
                }

                if (spec.control === 'shader' || spec.control === 'image') {
                    const options = spec.control === 'shader' ? shaderList : imageList
                    return html`
                        <${PickerRow}
                            key=${name}
                            label=${spec.label}
                            value=${value}
                            options=${options}
                            filter=${(o, q) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)}
                            pending=${isPending}
                            onPick=${(v) => stageReload(name, v)}
                            onClear=${clear}
                        />
                    `
                }

                return html`
                    <${SettingRow}
                        key=${name}
                        name=${name}
                        spec=${spec}
                        value=${value}
                        pending=${isPending}
                        onChange=${change}
                        onClear=${clear}
                    />
                `
            })}
        </div>
    `

    const otherSection = html`
        <div class="pp-section">
            <div class="pp-hint pp-pad">
                Anything the visualizer doesn't know about. Numeric values become
                <code>uniform float</code> in the shader.
            </div>
            ${otherKeys.map(
                (name) => html`
                    <${OtherRow}
                        key=${name}
                        name=${name}
                        value=${params[name]}
                        onChange=${(k, v) => setLive(k, numberish(v))}
                        onRename=${(from, to) => {
                            const value = params[from]
                            clearLive(from)
                            setLive(to, value)
                        }}
                        onDelete=${clearLive}
                    />
                `
            )}
            ${otherKeys.length === 0 ? html`<div class="pp-empty pp-pad">Nothing extra set.</div>` : null}
            <button
                class="pp-add"
                onClick=${() => {
                    let n = 1
                    while (`param_${n}` in params) n++
                    setLive(`param_${n}`, 0)
                }}
            >
                + add param
            </button>
        </div>
    `

    return html`
        <div class="pp-backdrop" onClick=${onClose}>
            <div class="pp-panel" onClick=${(e) => e.stopPropagation()}>
                <div class="pp-head">
                    <div class="pp-tabs">
                        <button
                            class=${`pp-tab ${tab === 'knobs' ? 'pp-active' : ''}`}
                            onClick=${() => setTab('knobs')}
                        >
                            Knobs${knobs.length ? html` <span class="pp-count">${knobs.length}</span>` : null}
                        </button>
                        <button
                            class=${`pp-tab ${tab === 'settings' ? 'pp-active' : ''}`}
                            onClick=${() => setTab('settings')}
                        >
                            Settings
                        </button>
                        <button
                            class=${`pp-tab ${tab === 'other' ? 'pp-active' : ''}`}
                            onClick=${() => setTab('other')}
                        >
                            Other${otherKeys.length ? html` <span class="pp-count">${otherKeys.length}</span>` : null}
                        </button>
                    </div>
                    <button class="pp-close" onClick=${onClose}>×</button>
                </div>

                <div class="pp-body">
                    ${tab === 'knobs' ? knobSection : null}
                    ${tab === 'settings' ? settingsSection : null}
                    ${tab === 'other' ? otherSection : null}
                </div>

                ${hasPending
                    ? html`
                          <div class="pp-apply-bar">
                              <span>Needs a reload to take effect</span>
                              <div class="pp-apply-actions">
                                  <button
                                      class="pp-btn"
                                      onClick=${() => {
                                          setPending({})
                                          setChain(readChain())
                                          setChainDirty(false)
                                      }}
                                  >
                                      Discard
                                  </button>
                                  <button class="pp-btn pp-primary" onClick=${applyPending}>Apply</button>
                              </div>
                          </div>
                      `
                    : null}

                <div class="pp-foot">
                    <button class="pp-btn" onClick=${() => copy(currentUrl(), toast)}>Copy link</button>
                    <button class="pp-btn" onClick=${() => copy(stripKnobs(currentUrl()), toast)}>
                        Copy clean
                    </button>
                    <button class="pp-btn" onClick=${resetAll}>Reset knobs</button>
                    <a class="pp-btn" href=${`/edit.html${window.location.search}`}>Edit</a>
                    <a class="pp-btn" href=${`/jam.html${window.location.search}`}>Jam</a>
                </div>
            </div>
        </div>
    `
}

// ---------------------------------------------------------------------------
// Mount
// ---------------------------------------------------------------------------

const App = ({ paramsManager, toast }) => {
    const [open, setOpen] = useState(false)

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') return setOpen(false)
            // Ignore the shortcut while something is being typed into.
            const tag = e.target?.tagName
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
            if (e.key === 'p' || e.key === 'P') setOpen((v) => !v)
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [])

    // The corner is its own element rather than a document-level gesture: the
    // canvas feeds touchstart/touchmove into shader uniforms, and index.html
    // already claims document click/touchend for the 9-tap PWA install. A
    // long-press on a 64px corner collides with neither.
    useEffect(() => {
        window.__paramsPanel = { open: () => setOpen(true), close: () => setOpen(false) }
    }, [])

    const corner = html`
        <div
            class="pp-corner"
            onPointerDown=${(e) => {
                const target = e.currentTarget
                target.setPointerCapture?.(e.pointerId)
                target._timer = setTimeout(() => {
                    target._fired = true
                    setOpen(true)
                    navigator.vibrate?.(15)
                }, LONG_PRESS_MS)
                target._fired = false
            }}
            onPointerUp=${(e) => clearTimeout(e.currentTarget._timer)}
            onPointerLeave=${(e) => clearTimeout(e.currentTarget._timer)}
            onPointerCancel=${(e) => clearTimeout(e.currentTarget._timer)}
        >
            <span class="pp-dot"></span>
        </div>
    `

    return html`
        <${Fragment}>
            ${open ? null : corner}
            ${open ? html`<${Panel} paramsManager=${paramsManager} toast=${toast} onClose=${() => setOpen(false)} />` : null}
        <//>
    `
}

const makeToast = () => (message, duration = 1600) => {
    if (window.flashToast) return window.flashToast(message, duration)
    let el = document.getElementById('pp-toast')
    if (!el) {
        el = document.createElement('div')
        el.id = 'pp-toast'
        el.className = 'pp-toast'
        document.body.appendChild(el)
    }
    el.textContent = message
    el.classList.add('pp-toast-on')
    clearTimeout(el._t)
    el._t = setTimeout(() => el.classList.remove('pp-toast-on'), duration)
}

/**
 * Mount the panel. Safe to call unconditionally — it declines to mount on
 * pages that already own a param UI, and in embeds.
 */
export const mountParamsPanel = (paramsManager) => {
    const search = new URLSearchParams(window.location.search)
    if (search.get('embed') === 'true') return
    // jam.html and edit.html load index.js too, but bring their own drawer.
    if (document.getElementById('feature-editor-root')) return
    if (/\/(edit|jam|vjpad)\.html$/.test(window.location.pathname)) return
    if (document.getElementById('params-panel-root')) return

    const root = document.createElement('div')
    root.id = 'params-panel-root'
    document.body.appendChild(root)
    render(html`<${App} paramsManager=${paramsManager} toast=${makeToast()} />`, root)
}
