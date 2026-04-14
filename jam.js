import { render, Fragment } from 'preact'
import { useState, useEffect, useRef } from 'preact/hooks'
import { html } from 'htm/preact'
import { createParamsManager } from './src/params/ParamsManager.js'

const searchParams = new URLSearchParams(window.location.search)

const paramsManager = createParamsManager({
    syncToUrl: true,
    remoteMode: false,
})
window.paramsManager = paramsManager

// Toast feedback
const flashToast = (message, duration = 1800) => {
    let toast = document.getElementById('jam-toast')
    if (!toast) {
        toast = document.createElement('div')
        toast.id = 'jam-toast'
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

// Spacebar snapshot — captures everything /preset needs so Claude can process offline
const snapshotPreset = async () => {
    const cranes = window.cranes
    if (!cranes) return

    const shaderParam = searchParams.get('shader')
    if (!shaderParam) {
        flashToast('No shader in URL — cannot snapshot')
        return
    }

    // Gather knob values (only knobs the user has set)
    const knobs = {}
    const manualFeatures = cranes.manualFeatures || {}
    for (const [key, value] of Object.entries(manualFeatures)) {
        if (key.startsWith('knob_')) knobs[key] = value
    }

    // Gather structured audio features — same format /preset expects
    const flat = cranes.flattenFeatures()
    const audioFeatureNames = [
        'bass', 'energy', 'mids', 'treble',
        'spectralCentroid', 'spectralFlux', 'spectralEntropy',
        'spectralRoughness', 'spectralKurtosis', 'spectralSpread',
        'spectralCrest', 'spectralRolloff', 'spectralSkew', 'pitchClass',
    ]
    const audio = {}
    for (const name of audioFeatureNames) {
        audio[name] = {
            normalized: Math.round((flat[name + 'Normalized'] || 0) * 1000) / 1000,
            zScore: Math.round((flat[name + 'ZScore'] || 0) * 1000) / 1000,
            slope: Math.round((flat[name + 'Slope'] || 0) * 10000) / 10000,
            rSquared: Math.round((flat[name + 'RSquared'] || 0) * 1000) / 1000,
        }
    }

    const payload = {
        shader: shaderParam,
        knobs,
        audio,
        name: null,
        musicTab: cranes.tabAudioLabel || null,
        userNote: null,
    }

    try {
        const res = await fetch('/__snapshot-preset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (data.ok) {
            flashToast('Snapshot saved')
        } else {
            flashToast(`Snapshot failed: ${data.error}`)
        }
    } catch (err) {
        flashToast(`Snapshot error: ${err.message}`)
    }
}

// Undo last snapshot — deletes the most recent one from the server
const undoLastSnapshot = async () => {
    const shaderParam = searchParams.get('shader')
    if (!shaderParam) {
        flashToast('No shader in URL')
        return
    }

    try {
        const res = await fetch('/__snapshot-preset', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shader: shaderParam }),
        })
        const data = await res.json()
        if (data.ok) {
            flashToast(`Deleted ${data.deleted} (${data.remaining} left)`)
        } else {
            flashToast(data.error || 'Nothing to undo')
        }
    } catch (err) {
        flashToast(`Undo error: ${err.message}`)
    }
}

const KNOB_REGEX = /^knob_(\d+)$/

const MidiLearnButton = ({ knobIndex }) => {
    const [state, setState] = useState('idle')
    const [ccLabel, setCcLabel] = useState(null)

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
        const val = e.target.value
        if (val === '') {
            onChange(name, { ...feature, min: '' })
        } else if (!isNaN(parseFloat(val))) {
            onChange(name, { ...feature, min: Math.round(parseFloat(val) * 10000) / 10000 })
        }
    }

    const handleMaxChange = (e) => {
        const val = e.target.value
        if (val === '') {
            onChange(name, { ...feature, max: '' })
        } else if (!isNaN(parseFloat(val))) {
            onChange(name, { ...feature, max: Math.round(parseFloat(val) * 10000) / 10000 })
        }
    }

    const handleKeyDown = (e, type) => {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
        e.preventDefault()

        const min = feature.min === '' || isNaN(parseFloat(feature.min)) ? 0 : parseFloat(feature.min)
        const max = feature.max === '' || isNaN(parseFloat(feature.max)) ? 1 : parseFloat(feature.max)
        const range = max - min
        const step = e.shiftKey ? range * 0.01 : range * 0.1

        const fieldName = type === 'min' ? 'min' : 'max'
        const currentVal = feature[fieldName]
        const numVal = currentVal === '' || isNaN(parseFloat(currentVal)) ? 0 : parseFloat(currentVal)
        const newVal = Math.round((e.key === 'ArrowUp' ? numVal + step : numVal - step) * 10000) / 10000

        onChange(name, { ...feature, [fieldName]: newVal })
    }

    const handleSliderKeyDown = (e) => {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
        e.preventDefault()

        const min = feature.min === '' ? 0 : parseFloat(feature.min)
        const max = feature.max === '' ? 1 : parseFloat(feature.max)
        const range = max - min
        const step = e.shiftKey ? range * 0.01 : range * 0.1
        const direction = e.key === 'ArrowUp' ? 1 : -1
        const newVal = Math.round((parseFloat(feature.value) + direction * step) * 10000) / 10000

        const updatedFeature = { ...feature }
        if (newVal > max) {
            updatedFeature.max = Math.round(newVal * 10000) / 10000
            updatedFeature.value = updatedFeature.max
        } else if (newVal < min) {
            updatedFeature.min = Math.round(newVal * 10000) / 10000
            updatedFeature.value = updatedFeature.min
        } else {
            updatedFeature.value = newVal
        }

        onChange(name, updatedFeature)
        handleCommitValue()
    }

    const formatNumber = (num) => {
        if (num === '' || isNaN(num)) return ''
        if (Number.isInteger(num) || Math.abs(num) < 0.0001) return num
        return parseFloat(num.toFixed(4))
    }

    const handleCommitValue = () => {
        paramsManager.set(name, feature.value)
    }

    useEffect(() => {
        if (feature.min !== '' && feature.max !== '' && !isNaN(feature.min) && !isNaN(feature.max)) {
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

const JamUI = () => {
    const [features, setFeatures] = useState({})
    const [newFeatureName, setNewFeatureName] = useState('')
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)
    const toggleButtonRef = useRef(null)
    const drawerRef = useRef(null)
    const newFeatureInputRef = useRef(null)
    const prevFeaturesLength = useRef(0)

    // Wiggle toggle when features are added
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

    // Focus new feature input when drawer opens
    useEffect(() => {
        if (isDrawerOpen && newFeatureInputRef.current) {
            setTimeout(() => newFeatureInputRef.current.focus(), 50)
        }
    }, [isDrawerOpen])

    // Global keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (event) => {
            // Cmd/Ctrl+Shift+D: toggle drawer
            if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'd') {
                event.preventDefault()
                setIsDrawerOpen(prev => !prev)
            }

            // Spacebar: snapshot preset (only when not typing in an input)
            if (event.code === 'Space' && !event.target.matches('input, textarea, select')) {
                event.preventDefault()
                snapshotPreset()
            }

            // Backspace/Delete: undo last snapshot (only when not typing in an input)
            if ((event.code === 'Backspace' || event.code === 'Delete') && !event.target.matches('input, textarea, select')) {
                event.preventDefault()
                undoLastSnapshot()
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [])

    // Click outside to close drawer
    useEffect(() => {
        if (!isDrawerOpen) return

        const handleClickOutside = (event) => {
            if (!drawerRef.current || drawerRef.current.contains(event.target)) return
            if (toggleButtonRef.current && toggleButtonRef.current.contains(event.target)) return
            setIsDrawerOpen(false)
        }

        const handleEscKey = (event) => {
            if (event.key === 'Escape') setIsDrawerOpen(false)
        }

        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('keydown', handleEscKey)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleEscKey)
        }
    }, [isDrawerOpen])

    // Initialize features from URL params
    useEffect(() => {
        const initialFeatures = {}
        searchParams.forEach((value, key) => {
            if (isNaN(value)) return
            const [featureName, paramType] = key.includes('.') ? key.split('.') : [key, 'value']
            if (!initialFeatures[featureName]) {
                initialFeatures[featureName] = { min: 0, max: 1, value: 0.5 }
            }
            initialFeatures[featureName][paramType] = parseFloat(value)
        })
        setFeatures(initialFeatures)
        prevFeaturesLength.current = Object.keys(initialFeatures).length

        if (searchParams.has('open_sliders')) setIsDrawerOpen(true)
    }, [])

    const updateFeature = (name, updatedFeature) => {
        updatedFeature.min = updatedFeature.min ?? 0
        updatedFeature.max = updatedFeature.max ?? 1
        updatedFeature.value = Math.round(updatedFeature.value * 1000) / 1000
        setFeatures(prev => ({ ...prev, [name]: updatedFeature }))
    }

    // Wire up cranes.updateFeature for MIDI
    useEffect(() => {
        if (window.cranes) {
            window.cranes.updateFeature = (name, value) => {
                updateFeature(name, { ...(features[name] || { min: 0, max: 1 }), value })
            }
        }
    }, [features])

    const addNewFeature = () => {
        if (!newFeatureName.trim()) return
        updateFeature(newFeatureName, { value: 0.5, min: 0, max: 1 })
        setNewFeatureName('')
    }

    const deleteFeature = (name) => {
        const { [name]: _, ...rest } = features
        setFeatures(rest)
        paramsManager.delete(name)
        paramsManager.delete(`${name}.min`)
        paramsManager.delete(`${name}.max`)
    }

    return html`
        <${Fragment}>
            <button
                ref=${toggleButtonRef}
                className="drawer-toggle"
                onClick=${() => setIsDrawerOpen(prev => !prev)}
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
                        onKeyDown=${(e) => { if (e.key === 'Enter' && newFeatureName.trim()) addNewFeature() }}
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

render(html`<${JamUI} />`, document.getElementById('feature-editor-root'))

// Load MIDI support
import('./src/midi.js')

// Hot-swap shader code without reloading (preserves tab audio permissions)
if (import.meta.hot) {
    import.meta.hot.on('shader-update', ({ shader, code }) => {
        const currentShader = searchParams.get('shader')
        if (!currentShader || shader !== currentShader) return
        window.cranes.shader = code
        flashToast('Shader updated')
    })

    // Hot-swap controller without reloading — just replace the function reference.
    // The animation loop in index.js reads from window._hotController each frame.
    import.meta.hot.on('controller-update', async ({ controller }) => {
        const currentController = searchParams.get('controller')
        if (!currentController || controller !== currentController) return
        try {
            const mod = await import(/* @vite-ignore */ `/controllers/${controller}.js?t=${Date.now()}`)
            const fn = mod.default || mod.make || mod
            if (typeof fn !== 'function') return
            window._hotController = fn
            flashToast(`Controller updated: ${controller}`)
        } catch (e) {
            flashToast(`Controller error: ${e.message}`)
        }
    })
}
