import { WebSocketClient } from '../remote/WebSocketClient.js'
import { getIdentity } from './identity.js'

const STYLE_EL_ID = 'mp-peer-styles'

// Peers' names and colors arrive from any /ws client, so they are text, never markup or CSS.
const PLAIN_COLOR = /^(#[0-9a-f]{3,8}|(hsl|rgb)a?\([\d.,%\s]+\))$/i
const safeColor = (c) => (typeof c === 'string' && PLAIN_COLOR.test(c) ? c : 'gray')

// Every editor on the dev server shares one /ws, so each message carries the shader it is about.
// Unscoped, a tab on star applied plasma's keystrokes, and a new tab took its first buffer from
// whichever peer answered its hello, on any shader. Read when used: the editor can switch shader.
const shaderNow = () => new URLSearchParams(window.location.search).get('shader') ?? ''
const SCOPED = new Set(['mp-hello', 'mp-sync-full', 'mp-edit', 'mp-cursor'])

const ensurePeerStyle = (userId, color, colorAlpha) => {
    let styleEl = document.getElementById(STYLE_EL_ID)
    if (!styleEl) {
        styleEl = document.createElement('style')
        styleEl.id = STYLE_EL_ID
        document.head.appendChild(styleEl)
    }
    const className = `mp-peer-${userId.replace(/[^a-z0-9]/gi, '')}`
    if (styleEl.textContent.includes(`.${className}-cursor`)) return className
    styleEl.textContent += `
        .${className}-cursor { background: ${safeColor(color)} !important; }
        .${className}-cursor::before { background: ${safeColor(color)}; }
        .${className}-selection { background: ${safeColor(colorAlpha)}; }
    `
    return className
}

export const initMultiplayerEditor = (editor) => {
    const identity = getIdentity()
    console.log('[MP] Starting multiplayer as', identity.name, identity.userId)

    const peers = new Map()
    let isApplyingRemoteEdit = false
    // Expose flag for HMR handler in monaco.js — disk changes reach all
    // peers via HMR directly, so they shouldn't also broadcast via multiplayer.
    editor.__isApplyingRemoteEdit = (val) => {
        if (val !== undefined) isApplyingRemoteEdit = val
        return isApplyingRemoteEdit
    }
    let isReady = false
    let peersEl = document.getElementById('multiplayer-peers')

    const updatePeersUI = () => {
        if (!peersEl) return
        const chip = (name, color) => {
            const el = document.createElement('span')
            el.className = 'mp-chip'
            el.style.background = safeColor(color)
            el.textContent = String(name ?? '')
            return el
        }
        peersEl.replaceChildren(
            chip(`${identity.name} (you)`, identity.color),
            ...Array.from(peers.values()).map(p => chip(p.name, p.color)),
        )
    }

    const renderPeerCursor = (peer) => {
        if (!peer.position) {
            peer.decorationIds = editor.deltaDecorations(peer.decorationIds || [], [])
            return
        }
        const className = ensurePeerStyle(peer.userId, peer.color, peer.colorAlpha)
        const decorations = []
        const { position, selection } = peer
        decorations.push({
            range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
            options: {
                className: `mp-peer-cursor ${className}-cursor`,
                beforeContentClassName: `mp-peer-cursor ${className}-cursor`,
                stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
                hoverMessage: { value: peer.name },
            },
        })
        if (selection && (selection.startLineNumber !== selection.endLineNumber || selection.startColumn !== selection.endColumn)) {
            decorations.push({
                range: new monaco.Range(
                    selection.startLineNumber, selection.startColumn,
                    selection.endLineNumber, selection.endColumn
                ),
                options: {
                    className: `mp-peer-selection ${className}-selection`,
                },
            })
        }
        peer.decorationIds = editor.deltaDecorations(peer.decorationIds || [], decorations)

        // Inject data-mp-name on the cursor element for the ::before label
        requestAnimationFrame(() => {
            document.querySelectorAll(`.${className}-cursor`).forEach(el => {
                el.setAttribute('data-mp-name', peer.name)
            })
        })
    }

    const getOrCreatePeer = (userId, name, color, colorAlpha) => {
        let peer = peers.get(userId)
        if (!peer) {
            peer = { userId, name, color, colorAlpha, decorationIds: [] }
            peers.set(userId, peer)
            updatePeersUI()
        } else {
            peer.name = name
            peer.color = color
            peer.colorAlpha = colorAlpha
        }
        return peer
    }

    const removePeer = (userId) => {
        const peer = peers.get(userId)
        if (!peer) return
        if (peer.decorationIds?.length) {
            editor.deltaDecorations(peer.decorationIds, [])
        }
        peers.delete(userId)
        updatePeersUI()
    }

    const handleMessage = (message) => {
        const { type, data } = message
        if (!type?.startsWith('mp-')) return

        if (data?.userId === identity.userId) return
        if (SCOPED.has(type) && data?.shader !== shaderNow()) return

        switch (type) {
            case 'mp-hello': {
                // A new peer is asking who's here — respond with our presence + current buffer
                client.send('mp-presence', identity)
                client.send('mp-sync-full', {
                    userId: identity.userId,
                    shader: shaderNow(),
                    targetUserId: data.userId,
                    content: editor.getValue(),
                })
                break
            }
            case 'mp-presence': {
                getOrCreatePeer(data.userId, data.name, data.color, data.colorAlpha)
                break
            }
            case 'mp-leave': {
                removePeer(data.userId)
                break
            }
            case 'mp-cursor': {
                const peer = getOrCreatePeer(data.userId, data.name, data.color, data.colorAlpha)
                peer.position = data.position
                peer.selection = data.selection
                renderPeerCursor(peer)
                break
            }
            case 'mp-edit': {
                isApplyingRemoteEdit = true
                try {
                    const edits = data.changes.map(c => ({
                        range: new monaco.Range(
                            c.range.startLineNumber, c.range.startColumn,
                            c.range.endLineNumber, c.range.endColumn
                        ),
                        text: c.text,
                        forceMoveMarkers: true,
                    }))
                    editor.getModel().applyEdits(edits)
                } finally {
                    isApplyingRemoteEdit = false
                }
                break
            }
            case 'mp-sync-full': {
                if (data.targetUserId && data.targetUserId !== identity.userId) break
                if (hasReceivedFullSync) break
                hasReceivedFullSync = true
                isApplyingRemoteEdit = true
                try {
                    editor.setValue(data.content)
                } finally {
                    isApplyingRemoteEdit = false
                }
                break
            }
        }
    }

    let hasReceivedFullSync = false

    const handleStatusChange = (status) => {
        console.log('[MP] Status:', status)
        if (status === 'connected') {
            // Announce ourselves and request state from any existing peers
            client.send('mp-presence', identity)
            client.send('mp-hello', { userId: identity.userId, shader: shaderNow() })
            // Go live after a brief settle period so the initial setValue
            // from monaco.js doesn't get broadcast as an edit
            setTimeout(() => {
                isReady = true
                console.log('[MP] Ready — broadcasting edits')
            }, 800)
        }
    }

    const client = new WebSocketClient(handleMessage, handleStatusChange)
    client.connect()

    // Broadcast local cursor/selection changes
    let cursorSendTimer = null
    const sendCursor = () => {
        if (!client.isConnected) return
        const position = editor.getPosition()
        const selection = editor.getSelection()
        client.send('mp-cursor', {
            ...identity,
            shader: shaderNow(),
            position: position ? { lineNumber: position.lineNumber, column: position.column } : null,
            selection: selection ? {
                startLineNumber: selection.startLineNumber,
                startColumn: selection.startColumn,
                endLineNumber: selection.endLineNumber,
                endColumn: selection.endColumn,
            } : null,
        })
    }
    const scheduleCursorSend = () => {
        if (cursorSendTimer) return
        cursorSendTimer = setTimeout(() => {
            cursorSendTimer = null
            sendCursor()
        }, 30)
    }

    editor.onDidChangeCursorPosition(scheduleCursorSend)
    editor.onDidChangeCursorSelection(scheduleCursorSend)

    editor.onDidChangeModelContent((e) => {
        if (isApplyingRemoteEdit) return
        if (!client.isConnected) return
        if (!isReady) return
        client.send('mp-edit', {
            userId: identity.userId,
            shader: shaderNow(),
            changes: e.changes.map(c => ({
                range: {
                    startLineNumber: c.range.startLineNumber,
                    startColumn: c.range.startColumn,
                    endLineNumber: c.range.endLineNumber,
                    endColumn: c.range.endColumn,
                },
                text: c.text,
            })),
        })
    })

    window.addEventListener('beforeunload', () => {
        if (client.isConnected) client.send('mp-leave', { userId: identity.userId })
    })

    updatePeersUI()

    return { identity, peers, client }
}
