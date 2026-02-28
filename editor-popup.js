// BroadcastChannel for communicating with the main editor window
const channel = new BroadcastChannel('paper-cranes-editor')

const updateStatus = (text, connected = true) => {
    const el = document.getElementById('connection-status')
    if (!el) return
    el.textContent = text
    el.className = connected ? 'connected' : ''
}

// Create a paramsManager shim that broadcasts shader changes to the main window
window.paramsManager = {
    setShader(code) {
        localStorage.setItem('cranes-manual-code', code)
        channel.postMessage({ type: 'shader-update', code })
        updateStatus('Saved')
        setTimeout(() => updateStatus('Connected'), 1500)
    },
    set() {},
    setMany() {},
    delete() {},
    getAll() { return {} },
}

// Set up minimal cranes object so monaco.js error checking works
window.cranes = window.cranes || { shader: null, error: null }

// Listen for messages from the main window
channel.addEventListener('message', (e) => {
    if (e.data.type === 'editor-sync') {
        const editor = window.monaco?.editor?.getEditors?.()?.[0]
        if (editor && e.data.code) {
            editor.pushUndoStop()
            editor.setValue(e.data.code)
            editor.pushUndoStop()
        }
        updateStatus('Connected')
    }
})

// Tell the main window we're ready
channel.postMessage({ type: 'popup-ready' })
updateStatus('Connected')

// Notify when closing
window.addEventListener('beforeunload', () => {
    channel.postMessage({ type: 'popup-closed' })
})
