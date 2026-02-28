import { render, Fragment } from 'preact'
import { useState, useEffect, useRef } from 'preact/hooks'
import { html } from 'htm/preact'
import { getRelativeOrAbsoluteShaderUrl } from './src/utils.js'
import { createParamsManager } from './src/params/ParamsManager.js'

// Check if we're in remote control mode
const searchParams = new URLSearchParams(window.location.search)
const isRemoteControlMode = searchParams.get('remote') === 'control'

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

// Expose paramsManager globally for monaco.js and other scripts
window.paramsManager = paramsManager

// Pop-out editor state
let popoutChannel = null
let popoutWindow = null
let popoutCheckInterval = null

const popOutEditor = () => {
    if (popoutWindow && !popoutWindow.closed) {
        popoutWindow.focus()
        return
    }

    popoutChannel = new BroadcastChannel('paper-cranes-editor')
    popoutWindow = window.open('editor-popup.html', 'paper-cranes-editor', 'width=800,height=900')

    document.body.classList.add('editor-popped-out')

    popoutChannel.addEventListener('message', (e) => {
        switch (e.data.type) {
            case 'popup-ready': {
                const code = localStorage.getItem('cranes-manual-code') || ''
                popoutChannel.postMessage({ type: 'editor-sync', code })
                break
            }
            case 'shader-update':
                paramsManager.setShader(e.data.code)
                break
            case 'popup-closed':
                restoreEditor()
                break
        }
    })

    // Poll for popup close (backup in case beforeunload doesn't fire)
    popoutCheckInterval = setInterval(() => {
        if (popoutWindow?.closed) {
            restoreEditor()
        }
    }, 500)
}

const restoreEditor = () => {
    if (popoutCheckInterval) {
        clearInterval(popoutCheckInterval)
        popoutCheckInterval = null
    }
    if (popoutChannel) {
        popoutChannel.close()
        popoutChannel = null
    }
    popoutWindow = null
    document.body.classList.remove('editor-popped-out')

    // Sync main editor with latest code from localStorage
    const code = localStorage.getItem('cranes-manual-code')
    const editor = window.monaco?.editor?.getEditors?.()?.[0]
    if (editor && code) {
        editor.pushUndoStop()
        editor.setValue(code)
        editor.pushUndoStop()
    }
}

document.getElementById('popout')?.addEventListener('click', popOutEditor)

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
                const editor = window.monaco?.editor?.getEditors?.()?.[0]
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
                    const editor = window.monaco?.editor?.getEditors?.()?.[0]
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

            // Check for Command/Control + Shift + E (pop out editor)
            if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'e') {
                event.preventDefault()
                popOutEditor()
            }
        }

        // Add keyboard listener globally
        document.addEventListener('keydown', handleGlobalKeyDown)

        // Clean up
        return () => {
            document.removeEventListener('keydown', handleGlobalKeyDown)
        }
    }, [isDrawerOpen, isPresentationMode]) // Add dependencies

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

    const handleShaderParam = async (searchParams) => {
        if (!searchParams.has('shader')) return false

        try {
            const shaderCode = await getRelativeOrAbsoluteShaderUrl(searchParams.get('shader'))
            localStorage.setItem('cranes-manual-code', shaderCode)
            const newUrl = new URL(window.location)
            newUrl.searchParams.delete('shader')
            window.history.replaceState({}, '', newUrl)
            window.location.reload()
            return true
        } catch (error) {
            console.error('Failed to fetch shader:', error)
            return false
        }
    }

    const initializeFeatures = (searchParams) => {
        const initialFeatures = {}
        searchParams.forEach((value, key) => {
            if (isNaN(value)) return
            const [featureName, paramType] = key.includes('.') ? key.split('.') : [key, 'value']
            if (!initialFeatures[featureName]) {
                initialFeatures[featureName] = { min: 0, max: 1, value: 0.5 }
            }
            initialFeatures[featureName][paramType] = parseFloat(value)
        })
        return initialFeatures
    }

    const handleUIState = (searchParams) => {
        if (searchParams.has('present')) {
            document.body.classList.add('present')
            setIsPresentationMode(true)
        }
        if (searchParams.has('open_sliders')) setIsDrawerOpen(true)
    }

    useEffect(() => {
        const init = async () => {
            const searchParams = new URLSearchParams(window.location.search)

            const shaderHandled = await handleShaderParam(searchParams)
            if (shaderHandled) return

            const initialFeatures = initializeFeatures(searchParams)
            setFeatures(initialFeatures)
            prevFeaturesLength.current = Object.keys(initialFeatures).length
            handleUIState(searchParams)
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
    for (const key of parsedUrl.searchParams.keys()) {
      if (!allowedParams.has(key)) {
        parsedUrl.searchParams.delete(key);
      }
    }
    return parsedUrl.toString();
  }

window.stripQueryParams = stripQueryParams
render(html`<${FeatureAdder} />`, document.getElementById('feature-editor-root'))

