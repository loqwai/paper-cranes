// Click-to-share overlay button for tab audio capture.
//
// getDisplayMedia requires a user gesture, so setupAudio can't call it at
// page load like it does for the mic. This renders a full-screen overlay
// with a single button. Resolves with the captured MediaStream once the
// user clicks and picks a source; rejects on denial. Re-shows itself if
// the user stops sharing later.

import { captureTabAudioStream, isTabAudioSupported } from './tabAudioSource.js'

const OVERLAY_ID = 'tab-audio-overlay'

const buildOverlay = (message, buttonLabel) => {
    const existing = document.getElementById(OVERLAY_ID)
    if (existing) existing.remove()

    const overlay = document.createElement('div')
    overlay.id = OVERLAY_ID
    overlay.style.cssText = [
        'position: fixed',
        'inset: 0',
        'z-index: 10000',
        'display: flex',
        'flex-direction: column',
        'align-items: center',
        'justify-content: center',
        'gap: 1.5rem',
        'background: rgba(0, 0, 0, 0.82)',
        'color: #f5f5f5',
        'font-family: system-ui, -apple-system, sans-serif',
        'text-align: center',
        'padding: 2rem',
    ].join(';')

    const title = document.createElement('div')
    title.textContent = 'Visualize tab audio'
    title.style.cssText = 'font-size: 1.6rem; font-weight: 600; letter-spacing: 0.02em;'

    const body = document.createElement('div')
    body.innerHTML = message
    body.style.cssText = 'max-width: 30rem; font-size: 0.95rem; line-height: 1.5; opacity: 0.85;'

    const button = document.createElement('button')
    button.textContent = buttonLabel
    button.style.cssText = [
        'appearance: none',
        'border: 1px solid #f5f5f5',
        'background: #f5f5f5',
        'color: #111',
        'font: inherit',
        'font-size: 1rem',
        'font-weight: 600',
        'padding: 0.85rem 1.6rem',
        'border-radius: 999px',
        'cursor: pointer',
    ].join(';')

    const status = document.createElement('div')
    status.style.cssText = 'min-height: 1.2rem; font-size: 0.85rem; color: #ff8080;'

    overlay.append(title, body, button, status)
    document.body.appendChild(overlay)

    return { overlay, button, status }
}

const removeOverlay = () => {
    const existing = document.getElementById(OVERLAY_ID)
    if (existing) existing.remove()
}

// Show the overlay and wait for the user to successfully share a tab.
// Resolves with the MediaStream. If the user cancels the picker we keep
// the overlay visible so they can try again.
export const promptForTabAudio = () => new Promise((resolve, reject) => {
    if (!isTabAudioSupported()) {
        const { status } = buildOverlay(
            'This browser does not support capturing tab audio. Open Paper Cranes in Chrome or Edge on desktop.',
            'Unsupported',
        )
        status.textContent = 'navigator.mediaDevices.getDisplayMedia is unavailable.'
        reject(new Error('Tab audio capture unsupported'))
        return
    }

    const { button, status } = buildOverlay(
        'Click the button, pick your Spotify tab (or any tab/window), and check <strong>"Share tab audio"</strong> in the picker. No loopback driver required.',
        'Share tab audio',
    )

    button.addEventListener('click', async () => {
        status.textContent = ''
        button.disabled = true
        button.style.opacity = '0.6'
        try {
            const stream = await captureTabAudioStream()
            removeOverlay()
            resolve(stream)
        } catch (err) {
            button.disabled = false
            button.style.opacity = '1'
            status.textContent = err?.message ?? String(err)
            console.error('Tab audio capture failed:', err)
        }
    })
})
