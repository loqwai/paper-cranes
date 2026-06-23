import { render, Fragment } from 'preact'
import { useState, useEffect, useRef } from 'preact/hooks'
import { html } from 'htm/preact'
import { getRelativeOrAbsoluteShaderUrl } from './src/utils.js'
import { createParamsManager } from './src/params/ParamsManager.js'
import { initMultiplayerEditor } from './src/multiplayer/MultiplayerEditor.js'
import { getHashParams, setHashParam, deleteHashParam } from './src/params/urlParams.js'

// Initialize multiplayer editing as soon as Monaco is ready
const startMultiplayer = () => {
    const editor = window.__monacoEditor
    if (!editor) return
    try {
        initMultiplayerEditor(editor)
    } catch (e) {
        console.error('[MP] Failed to initialize multiplayer:', e)
    }
}
if (window.__monacoEditor) {
    startMultiplayer()
} else {
    window.addEventListener('monaco-editor-ready', startMultiplayer, { once: true })
}

// Check if we're in remote control mode
const isRemoteControlMode = getHashParams().get('remote') === 'control'

// Create params manager - single source of truth for all params
// Handles URL sync and remote sync automatically
const paramsManager = createParamsManager({
    syncToUrl: true,
    remoteMode: isRemoteControlMode,
    onRemoteStatusChange: (status, info) => {
        console.log('[Edit] Remote status:', status, info)
        updateRemoteStatusIndicator(status, info)
    }
})

// Remote status indicator
const updateRemoteStatusIndicator = (status, info) => {
    let indicator = document.getElementById('remote-control-indicator')

    if (!indicator) {
        indicator = document.createElement('div')
        indicator.id = 'remote-control-indicator'
        indicator.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            padding: 6px 12px;
            border-radius: 4px;
            font-family: system-ui, sans-serif;
            font-size: 12px;
            z-index: 10000;
            pointer-events: none;
            transition: opacity 0.3s, background-color 0.3s;
        `
        document.body.appendChild(indicator)
    }

    const statusConfig = {
        connected: { bg: '#22c55e', text: `Remote: ${info?.connectedClients || 0} displays`, opacity: 0.9 },
        disconnected: { bg: '#ef4444', text: 'Remote: Disconnected', opacity: 1 },
        reconnecting: { bg: '#eab308', text: 'Remote: Reconnecting...', opacity: 1 },
        error: { bg: '#ef4444', text: 'Remote: Error', opacity: 1 },
    }

    const config = statusConfig[status] || statusConfig.disconnected
    indicator.style.backgroundColor = config.bg
    indicator.style.color = 'white'
    indicator.style.opacity = config.opacity
    indicator.textContent = config.text
}

// Show remote indicator immediately if in remote mode
if (isRemoteControlMode) {
    updateRemoteStatusIndicator('reconnecting', {})
}

// Param Navigator: a hidden-by-default panel for inspecting/editing URL query params.
// Toggle with Cmd/Ctrl+Shift+U. Stays out of the way; pure DOM, no framework.
const ParamNavigator = (() => {
    let panel = null
    let listEl = null
    let isOpen = false

    const KEY_BLACKLIST = new Set(['present', 'open_sliders'])

    const build = () => {
        panel = document.createElement('div')
        panel.id = 'param-navigator'
        panel.style.cssText = `
            position: fixed;
            top: 50px;
            left: 10px;
            width: 320px;
            max-height: 70vh;
            background: rgba(15, 15, 20, 0.95);
            color: #eee;
            border: 1px solid #333;
            border-radius: 8px;
            padding: 12px;
            font-family: ui-monospace, Menlo, monospace;
            font-size: 12px;
            z-index: 10002;
            display: none;
            box-shadow: 0 8px 24px rgba(0,0,0,0.5);
            overflow: hidden;
            flex-direction: column;
            gap: 8px;
        `

        const header = document.createElement('div')
        header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #333;padding-bottom:6px;'
        header.innerHTML = `<strong style="font-size:11px;letter-spacing:0.5px;">URL PARAMS</strong><span style="font-size:10px;opacity:0.6;">⌘⇧U to close</span>`
        panel.appendChild(header)

        listEl = document.createElement('div')
        listEl.style.cssText = 'overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:4px;min-height:0;'
        panel.appendChild(listEl)

        const addRow = document.createElement('div')
        addRow.style.cssText = 'display:flex;gap:4px;border-top:1px solid #333;padding-top:6px;'
        const keyInput = document.createElement('input')
        const valInput = document.createElement('input')
        const addBtn = document.createElement('button')
        keyInput.placeholder = 'key'
        valInput.placeholder = 'value'
        addBtn.textContent = '+'
        ;[keyInput, valInput].forEach(i => {
            i.style.cssText = 'flex:1;background:#222;color:#eee;border:1px solid #444;border-radius:4px;padding:4px 6px;font-family:inherit;font-size:11px;min-width:0;'
        })
        addBtn.style.cssText = 'background:#2a4;color:#fff;border:none;border-radius:4px;padding:4px 10px;cursor:pointer;font-size:13px;'
        const submit = () => {
            const k = keyInput.value.trim()
            if (!k) return
            setParam(k, valInput.value)
            keyInput.value = ''
            valInput.value = ''
            keyInput.focus()
            render()
        }
        addBtn.addEventListener('click', submit)
        ;[keyInput, valInput].forEach(i => i.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); submit() }
            e.stopPropagation()
        }))
        addRow.append(keyInput, valInput, addBtn)
        panel.appendChild(addRow)

        const footer = document.createElement('div')
        footer.style.cssText = 'display:flex;gap:4px;'
        const mkBtn = (label, bg, fn) => {
            const b = document.createElement('button')
            b.textContent = label
            b.style.cssText = `flex:1;background:${bg};color:#fff;border:none;border-radius:4px;padding:5px;cursor:pointer;font-size:11px;`
            b.addEventListener('click', fn)
            return b
        }
        footer.append(
            mkBtn('Copy URL', '#446', () => {
                navigator.clipboard?.writeText(window.location.href)
                flashToast('URL copied')
            }),
            mkBtn('Open viewer', '#464', () => {
                const url = new URL(window.location.href)
                url.pathname = url.pathname.replace(/edit\.html?$/, 'index.html')
                url.search = ''
                window.open(url.toString(), '_blank')
            }),
            mkBtn('→ list', '#644', () => {
                const hp = getHashParams()
                const keep = new URLSearchParams()
                for (const k of ['remote', 'room', 'relay']) {
                    if (hp.has(k)) keep.set(k, hp.get(k))
                }
                window.location.href = `/list.html#${keep.toString()}`
            }),
        )
        panel.appendChild(footer)

        document.body.appendChild(panel)
    }

    const setParam = (key, value) => {
        if (value === '' || value === null || value === undefined) {
            deleteHashParam(key)
        } else {
            setHashParam(key, value)
        }
        // Also push to paramsManager so the visualizer/remote pick it up
        const num = parseFloat(value)
        if (window.paramsManager) {
            if (value === '' || value === null) {
                window.paramsManager.delete(key)
            } else {
                window.paramsManager.set(key, isNaN(num) ? value : num)
            }
        }
    }

    const render = () => {
        if (!listEl) return
        listEl.innerHTML = ''
        const entries = Array.from(getHashParams().entries())
        if (entries.length === 0) {
            const empty = document.createElement('div')
            empty.style.cssText = 'opacity:0.5;font-style:italic;padding:8px 0;'
            empty.textContent = 'no query params'
            listEl.appendChild(empty)
            return
        }
        for (const [key, value] of entries) {
            if (KEY_BLACKLIST.has(key)) continue
            const row = document.createElement('div')
            row.style.cssText = 'display:flex;gap:4px;align-items:center;'

            const keyEl = document.createElement('span')
            keyEl.textContent = key
            keyEl.style.cssText = 'flex:0 0 38%;color:#9cf;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;'
            keyEl.title = key

            const input = document.createElement('input')
            input.value = value
            input.style.cssText = 'flex:1;background:#222;color:#eee;border:1px solid #333;border-radius:3px;padding:3px 5px;font-family:inherit;font-size:11px;min-width:0;'
            input.addEventListener('change', () => {
                setParam(key, input.value)
            })
            input.addEventListener('keydown', (e) => e.stopPropagation())

            const delBtn = document.createElement('button')
            delBtn.textContent = '×'
            delBtn.title = `Remove ${key}`
            delBtn.style.cssText = 'background:#622;color:#fff;border:none;border-radius:3px;padding:2px 7px;cursor:pointer;font-size:12px;'
            delBtn.addEventListener('click', () => {
                setParam(key, '')
                render()
            })

            row.append(keyEl, input, delBtn)
            listEl.appendChild(row)
        }
    }

    return {
        toggle() {
            if (!panel) build()
            isOpen = !isOpen
            panel.style.display = isOpen ? 'flex' : 'none'
            if (isOpen) render()
        },
        refresh() {
            if (isOpen) render()
        },
    }
})()
window.ParamNavigator = ParamNavigator

// Lightweight transient toast for keyboard-shortcut feedback
const flashToast = (message, duration = 1800) => {
    let toast = document.getElementById('edit-toast')
    if (!toast) {
        toast = document.createElement('div')
        toast.id = 'edit-toast'
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 10px 18px;
            background: rgba(0, 0, 0, 0.85);
            color: #fff;
            border-radius: 6px;
            font-family: system-ui, sans-serif;
            font-size: 13px;
            max-width: 90vw;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            z-index: 10001;
            opacity: 0;
            transition: opacity 0.2s;
            pointer-events: none;
        `
        document.body.appendChild(toast)
    }
    toast.textContent = message
    toast.style.opacity = '1'
    clearTimeout(toast._hideTimer)
    toast._hideTimer = setTimeout(() => { toast.style.opacity = '0' }, duration)
}
window.flashToast = flashToast

// Expose paramsManager globally for monaco.js and other scripts
window.paramsManager = paramsManager

const KNOB_REGEX = /^knob_(\d+)$/

const MidiLearnButton = ({ knobIndex }) => {
    const [state, setState] = useState('idle') // idle | learning | mapped
    const [ccLabel, setCcLabel] = useState(null)

    // Check for existing mapping on mount
    useEffect(() => {
        const mapper = window.cranes?.midiMapper
        if (!mapper) return
        const profiles = mapper.getAllProfiles()
        for (const profile of Object.values(profiles)) {
            for (const [ccKey, idx] of Object.entries(profile.mappings)) {
                if (idx === knobIndex) {
                    setCcLabel(`CC${ccKey}`)
                    setState('mapped')
                    return
                }
            }
        }
    }, [knobIndex])

    const handleClick = async () => {
        const mapper = window.cranes?.midiMapper
        if (!mapper) return

        if (state === 'learning') {
            mapper.cancelLearn()
            setState(ccLabel ? 'mapped' : 'idle')
            return
        }

        setState('learning')
        try {
            const result = await mapper.startLearn(knobIndex)
            setCcLabel(`CC${result.ccKey}`)
            setState('mapped')
        } catch {
            setState(ccLabel ? 'mapped' : 'idle')
        }
    }

    const label = state === 'learning' ? '...' : state === 'mapped' ? ccLabel : 'MIDI'

    return html`
        <button
            class=${`midi-learn-btn ${state === 'learning' ? 'learning' : ''}`}
            onClick=${handleClick}
            title=${state === 'learning' ? 'Click to cancel learn' : 'Click to learn MIDI CC'}
        >${label}</button>
    `
}

const FeatureEditor = ({ name, feature, onChange, onDelete }) => {
    const handleValueChange = (e) => onChange(name, { ...feature, value: parseFloat(e.target.value) })

    const handleMinChange = (e) => {
        // Allow the field to be empty temporarily
        const val = e.target.value
        if (val === '') {
            onChange(name, { ...feature, min: '' })
        } else if (!isNaN(parseFloat(val))) {
            const numericValue = parseFloat(val)
            // Round to 4 decimal places to avoid floating point errors
            const roundedValue = Math.round(numericValue * 10000) / 10000
            onChange(name, { ...feature, min: roundedValue })
        }
    }

    const handleMaxChange = (e) => {
        // Allow the field to be empty temporarily
        const val = e.target.value
        if (val === '') {
            onChange(name, { ...feature, max: '' })
        } else if (!isNaN(parseFloat(val))) {
            const numericValue = parseFloat(val)
            // Round to 4 decimal places to avoid floating point errors
            const roundedValue = Math.round(numericValue * 10000) / 10000
            onChange(name, { ...feature, max: roundedValue })
        }
    }

    const handleKeyDown = (e, type) => {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;

        e.preventDefault()

        // Get min and max values
        const min = feature.min === '' || isNaN(parseFloat(feature.min)) ? 0 : parseFloat(feature.min)
        const max = feature.max === '' || isNaN(parseFloat(feature.max)) ? 1 : parseFloat(feature.max)

        // Calculate range and step size based on percentage
        const range = max - min
        const step = e.shiftKey ? range * 0.01 : range * 0.1

        // Get current value
        const fieldName = type === 'min' ? 'min' : 'max'
        const currentVal = feature[fieldName]
        const numVal = currentVal === '' || isNaN(parseFloat(currentVal)) ? 0 : parseFloat(currentVal)

        // Calculate new value based on key pressed and round to 4 decimal places
        const newVal = Math.round((e.key === 'ArrowUp' ? numVal + step : numVal - step) * 10000) / 10000

        // Update the value
        const updatedFeature = { ...feature }
        updatedFeature[fieldName] = newVal
        onChange(name, updatedFeature)
    }

    const handleSliderKeyDown = (e) => {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;

        e.preventDefault()

        // Get current min and max
        const min = feature.min === '' ? 0 : parseFloat(feature.min)
        const max = feature.max === '' ? 1 : parseFloat(feature.max)

        // Calculate step size as percentage of the range
        const range = max - min
        const step = e.shiftKey ? range * 0.01 : range * 0.1

        // Get current value
        const currentVal = parseFloat(feature.value)

        // Calculate new value based on key pressed and round to 4 decimal places
        // Make sure arrow up increases and arrow down decreases the value
        const direction = e.key === 'ArrowUp' ? 1 : -1
        const newVal = Math.round((currentVal + direction * step) * 10000) / 10000

        // Create updated feature object
        const updatedFeature = { ...feature }

        // If the new value exceeds max, expand the max boundary
        if (newVal > max) {
            updatedFeature.max = Math.round(newVal * 10000) / 10000
            updatedFeature.value = updatedFeature.max
        }
        // If the new value is below min, expand the min boundary
        else if (newVal < min) {
            updatedFeature.min = Math.round(newVal * 10000) / 10000
            updatedFeature.value = updatedFeature.min
        }
        // Otherwise just update the value within boundaries
        else {
            updatedFeature.value = newVal
        }

        onChange(name, updatedFeature)
        handleCommitValue()
    }

    // Format displayed value to avoid floating point issues
    const formatNumber = (num) => {
        if (num === '' || isNaN(num)) return ''
        // For small numbers or integers, show as is
        if (Number.isInteger(num) || Math.abs(num) < 0.0001) return num
        // Otherwise limit to 4 decimal places
        return parseFloat(num.toFixed(4))
    }

    const handleCommitValue = () => {
        paramsManager.set(name, feature.value)
    }

    useEffect(() => {
        if (feature.min !== '' && feature.max !== '' && !isNaN(feature.min) && !isNaN(feature.max)) {
            // Use paramsManager - handles URL sync, remote sync, and cranes.manualFeatures
            paramsManager.setMany({
                [name]: feature.value,
                [`${name}.min`]: feature.min,
                [`${name}.max`]: feature.max,
            })
        }
    }, [feature])

    return html`
        <div className="edit-feature" key=${name}>
            <div class="feature-header">
                <div class="feature-name">
                    <span>${name}</span>
                    ${KNOB_REGEX.test(name) && html`<${MidiLearnButton} knobIndex=${parseInt(name.match(KNOB_REGEX)[1])} />`}
                    <span class="value-display">${feature.value.toFixed(2)}</span>
                    <button onClick=${() => onDelete(name)} class="delete-button" title="Delete feature"></button>
                </div>
                <div class="slider-container">
                    <input
                        type="number"
                        value=${formatNumber(feature.min)}
                        onInput=${handleMinChange}
                        onKeyDown=${(e) => handleKeyDown(e, 'min')}
                        placeholder="0"
                        class="min-input"
                        step="0.1"
                    />
                    <input
                        class="feature-value"
                        type="range"
                        min=${feature.min === '' ? 0 : feature.min}
                        max=${feature.max === '' ? 1 : feature.max}
                        step="0.01"
                        value=${feature.value}
                        onInput=${handleValueChange}
                        onChange=${handleCommitValue}
                        onKeyDown=${handleSliderKeyDown}
                    />
                    <input
                        type="number"
                        value=${formatNumber(feature.max)}
                        onInput=${handleMaxChange}
                        onKeyDown=${(e) => handleKeyDown(e, 'max')}
                        placeholder="1"
                        class="max-input"
                        step="0.1"
                    />
                </div>
            </div>
        </div>
    `
}

const FeatureAdder = () => {
    const [features, setFeatures] = useState({})
    const [newFeatureName, setNewFeatureName] = useState('')
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)
    const [isPresentationMode, setIsPresentationMode] = useState(false)
    const toggleButtonRef = useRef(null)
    const drawerRef = useRef(null)
    const newFeatureInputRef = useRef(null)
    const prevFeaturesLength = useRef(0)
    const editorCursorPositionRef = useRef(null) // Store cursor position

    // Focus the new feature input when drawer opens or monaco when drawer closes
    useEffect(() => {
        if (isDrawerOpen && newFeatureInputRef.current) {
            // Store current cursor position before focusing drawer
            try {
                const editor = window.__monacoEditor
                if (editor) {
                    editorCursorPositionRef.current = editor.getPosition()
                }
            } catch (e) {
                console.error('Error saving cursor position:', e)
            }

            // Small delay to ensure DOM is ready and drawer animation has started
            setTimeout(() => {
                newFeatureInputRef.current.focus()
            }, 50)
        } else if (!isDrawerOpen) {
            // Focus monaco editor when drawer closes
            setTimeout(() => {
                try {
                    const editor = window.__monacoEditor
                    if (editor) {
                        editor.focus()
                        // Restore cursor position if we have one saved
                        if (editorCursorPositionRef.current) {
                            editor.setPosition(editorCursorPositionRef.current)
                            editor.revealPositionInCenter(editorCursorPositionRef.current)
                        }
                    }
                } catch (e) {
                    console.error('Error restoring cursor position:', e)
                }
            }, 50)
        }
    }, [isDrawerOpen])

    useEffect(() => {
        const currentLength = Object.keys(features).length
        if (currentLength > prevFeaturesLength.current && toggleButtonRef.current) {
            const button = toggleButtonRef.current
            button.classList.remove('wiggle')
            button.classList.add('wiggle')
            setTimeout(() => button.classList.remove('wiggle'), 1000)
        }
        prevFeaturesLength.current = currentLength
    }, [features])

    // Add global keyboard shortcut for opening drawer
    useEffect(() => {
        const handleGlobalKeyDown = (event) => {
            // Check for Command/Control + Shift + D
            if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'd') {
                event.preventDefault() // Prevent browser default actions
                setIsDrawerOpen(!isDrawerOpen) // Toggle drawer state
            }

            // Check for Command/Control + Shift + E (presentation mode)
            if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'e') {
                event.preventDefault() // Prevent browser default actions
                openRendererInANewWindowAndControlIt() // Toggle presentation mode
            }

            // Cmd/Ctrl + Shift + U: toggle URL/param navigator
            if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'u') {
                event.preventDefault()
                ParamNavigator.toggle()
            }

            // Cmd/Ctrl + Shift + C: copy a shareable viewer URL to clipboard
            if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'c') {
                event.preventDefault()
                const viewerUrl = buildViewerUrl().toString()
                navigator.clipboard?.writeText(viewerUrl)
                flashToast(`Copied: ${viewerUrl}`)
            }

            // Cmd/Ctrl + Shift + L: jump back to the list page (preserves remote=control)
            if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'l') {
                event.preventDefault()
                const hp = getHashParams()
                const keep = new URLSearchParams()
                for (const k of ['remote', 'room', 'relay', 'filter', 'favoritesOnly', 'fullscreenOnly', 'wip']) {
                    if (hp.has(k)) keep.set(k, hp.get(k))
                }
                window.location.href = `/list.html#${keep.toString()}`
            }
        }

        // Add keyboard listener globally
        document.addEventListener('keydown', handleGlobalKeyDown)

        // Clean up
        return () => {
            document.removeEventListener('keydown', handleGlobalKeyDown)
        }
    }, [isDrawerOpen, isPresentationMode]) // Add dependencies

    const buildViewerUrl = () => {
       const url = new URL(window.location.href)
       url.pathname = url.pathname.replace(/edit\.html?$/, 'index.html').replace(/\/edit$/, '/')
       if (url.pathname === '' || url.pathname === '/edit') url.pathname = '/'
       url.search = ''
       return url
    }

    const openRendererInANewWindowAndControlIt = () => {
       // open renderer in a new window — preserves all query params (shader, knobs, remote, etc.)
       const newWindow = window.open(buildViewerUrl().toString(), '_blank', 'width=1000,height=1000')
       sendCranesStateToNewWindow(newWindow)
    }

    const sendCranesStateToNewWindow = (newWindow) => {
        //get the shaderCode = window.cranes.shader
        const shaderCode = window.cranes.shader
        newWindow.postMessage({ type: 'update-params', data: { shaderCode, ...window.cranes.flattenFeatures()}})
        requestAnimationFrame( () => sendCranesStateToNewWindow(newWindow))
    }

    // Add click outside handler
    useEffect(() => {
        const handleClickOutside = (event) => {
            // If drawer is closed or click is inside drawer or on toggle button, do nothing
            if (!isDrawerOpen ||
                !drawerRef.current ||
                drawerRef.current.contains(event.target) ||
                (toggleButtonRef.current && toggleButtonRef.current.contains(event.target))) {
                return
            }

            // Close the drawer
            setIsDrawerOpen(false)
        }

        // Handle Escape key to close drawer
        const handleEscKey = (event) => {
            if (event.key === 'Escape' && isDrawerOpen) {
                setIsDrawerOpen(false)
            }
        }

        // Add event listener when drawer is open
        if (isDrawerOpen) {
            document.addEventListener('mousedown', handleClickOutside)
            document.addEventListener('keydown', handleEscKey)
        }

        // Clean up
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleEscKey)
        }
    }, [isDrawerOpen])

    const handleShaderParam = async (hashParams) => {
        if (!hashParams.has('shader')) return false

        try {
            const shaderCode = await getRelativeOrAbsoluteShaderUrl(hashParams.get('shader'))
            localStorage.setItem('cranes-manual-code', shaderCode)

            if (import.meta.hot) {
                // Dev mode: keep #shader= in URL so editor-sync knows which file to save to.
                // Monaco init will load from the filesystem via shader param.
                return false
            }

            // Production: strip shader param and reload (original behavior)
            deleteHashParam('shader')
            window.location.reload()
            return true
        } catch (error) {
            console.error('Failed to fetch shader:', error)
            return false
        }
    }

    const initializeFeatures = (hashParams) => {
        const initialFeatures = {}
        hashParams.forEach((value, key) => {
            if (isNaN(value)) return
            const [featureName, paramType] = key.includes('.') ? key.split('.') : [key, 'value']
            if (!initialFeatures[featureName]) {
                initialFeatures[featureName] = { min: 0, max: 1, value: 0.5 }
            }
            initialFeatures[featureName][paramType] = parseFloat(value)
        })
        return initialFeatures
    }

    const handleUIState = (hashParams) => {
        if (hashParams.has('present')) {
            document.body.classList.add('present')
            setIsPresentationMode(true)
        }
        if (hashParams.has('open_sliders')) setIsDrawerOpen(true)
    }

    useEffect(() => {
        const init = async () => {
            const hp = getHashParams()

            const shaderHandled = await handleShaderParam(hp)
            if (shaderHandled) return

            const initialFeatures = initializeFeatures(hp)
            setFeatures(initialFeatures)
            prevFeaturesLength.current = Object.keys(initialFeatures).length
            handleUIState(hp)
        }

        init()
    }, [])

    const toggleDrawer = () => {
        setIsDrawerOpen(!isDrawerOpen)
    }

    const updateFeature = (name, updatedFeature) => {
        updatedFeature.min = updatedFeature.min ?? 0
        updatedFeature.max = updatedFeature.max ?? 1
        updatedFeature.value = Math.round(updatedFeature.value * 1000) / 1000
        setFeatures((prev) => ({ ...prev, [name]: updatedFeature }))
    }

    window.cranes.updateFeature = (name, value) => {
        updateFeature(name, { ...features[name], value })
    }

    const addNewFeature = () => {
        if (!newFeatureName.trim()) {
            alert('Feature name cannot be empty')
            return
        }
        const newFeature = { value: 0.5, min: 0, max: 1 }
        updateFeature(newFeatureName, newFeature)
        setNewFeatureName('')
    }

    const deleteFeature = (name) => {
        const { [name]: _, ...rest } = features
        setFeatures(rest)
        // paramsManager handles URL sync, remote sync, and cranes.manualFeatures cleanup
        paramsManager.delete(name)
        paramsManager.delete(`${name}.min`)
        paramsManager.delete(`${name}.max`)
    }

    const handleNewFeatureKeyDown = (e) => {
        if (e.key === 'Enter' && newFeatureName.trim()) {
            addNewFeature()
        }
    }

    return html`
        <${Fragment}>
            <button
                ref=${toggleButtonRef}
                className="drawer-toggle"
                onClick=${toggleDrawer}
            >
                ${isDrawerOpen ? '×' : '⚙️'}
            </button>
            <div
                ref=${drawerRef}
                className=${`sparkly animated ${isDrawerOpen ? 'open' : ''}`}
                id="feature-editor"
            >
                <div className="new-feature">
                    <input
                        type="text"
                        value=${newFeatureName}
                        onInput=${(e) => setNewFeatureName(e.target.value)}
                        onKeyDown=${handleNewFeatureKeyDown}
                        placeholder="Enter new feature name and press Enter"
                        ref=${newFeatureInputRef}
                    />
                </div>
                <div id="existing-features-editor">
                    ${Object.entries(features).map(
                        ([name, feature]) => html`
                            <${FeatureEditor}
                                key=${name}
                                name=${name}
                                feature=${feature}
                                onChange=${updateFeature}
                                onDelete=${deleteFeature}
                            />
                        `
                    )}
                </div>
            </div>
        </${Fragment}>
    `
}

function stripQueryParams(url) {
    const allowedParams = new Set(['image', 'fullscreen']);
    const parsedUrl = new URL(url);
    const hashParams = new URLSearchParams(parsedUrl.hash.slice(1))
    const kept = new URLSearchParams()
    for (const [key, value] of hashParams) {
      if (allowedParams.has(key)) kept.set(key, value)
    }
    parsedUrl.search = ''
    parsedUrl.hash = kept.toString()
    return parsedUrl.toString();
  }

window.stripQueryParams = stripQueryParams
render(html`<${FeatureAdder} />`, document.getElementById('feature-editor-root'))

