import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const clients = vi.hoisted(() => [])

vi.mock('../remote/WebSocketClient.js', () => ({
  WebSocketClient: class {
    isConnected = true
    sent = []
    constructor(onMessage, onStatusChange) {
      this.onMessage = onMessage
      this.onStatusChange = onStatusChange
      clients.push(this)
    }
    connect() {}
    send(type, data) { this.sent.push({ type, data }) }
  },
}))

// A Monaco editor reduced to what the module touches: a text buffer and change listeners.
const makeEditor = (text) => {
  const contentListeners = []
  let value = text
  return {
    getValue: () => value,
    setValue: (v) => { value = v },
    getModel: () => ({ applyEdits: (edits) => edits.forEach((e) => { value = value + e.text }) }),
    getPosition: () => null,
    getSelection: () => null,
    deltaDecorations: () => [],
    onDidChangeCursorPosition() {},
    onDidChangeCursorSelection() {},
    onDidChangeModelContent: (fn) => contentListeners.push(fn),
    type: (t) => { value += t; contentListeners.forEach((fn) => fn({ changes: [{ range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 }, text: t }] })) },
  }
}

let peersEl
let href
let styleEl
beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(console, 'log').mockImplementation(() => {})
  clients.length = 0
  peersEl = { innerHTML: '', children: [], replaceChildren(...els) { this.children = els; this.innerHTML = '' }, append(...els) { this.children.push(...els) } }
  styleEl = null
  href = 'http://localhost:6969/edit.html?shader=plasma'
  const sessionStore = {}
  globalThis.sessionStorage = { getItem: (k) => sessionStore[k] ?? null, setItem: (k, v) => { sessionStore[k] = v } }
  globalThis.window = { get location() { return new URL(href) }, addEventListener() {} }
  globalThis.monaco = { Range: class { constructor(...a) { this.a = a } }, editor: { TrackedRangeStickiness: {} } }
  globalThis.requestAnimationFrame = () => {}
  globalThis.document = {
    getElementById: (id) => (id === 'multiplayer-peers' ? peersEl : id === 'mp-peer-styles' ? styleEl : null),
    createElement: (tag) => {
      const el = { tag, style: {}, textContent: '', className: '' }
      if (tag === 'style') styleEl = el
      return el
    },
    head: { appendChild() {} },
    querySelectorAll: () => [],
  }
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.resetModules()
  for (const k of ['sessionStorage', 'window', 'monaco', 'requestAnimationFrame', 'document']) delete globalThis[k]
})

const start = async (text = 'void main(){}') => {
  const { initMultiplayerEditor } = await import('./MultiplayerEditor.js')
  const editor = makeEditor(text)
  const store = {} // each editor is its own tab, with its own identity
  globalThis.sessionStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v } }
  initMultiplayerEditor(editor)
  const client = clients.at(-1)
  client.onStatusChange('connected')
  vi.advanceTimersByTime(1000)
  return { editor, client }
}

describe('MultiplayerEditor', () => {
  it('does not apply an edit made to another shader', async () => {
    const { editor, client } = await start('PLASMA')
    // The sender's own tab stamps its message the same way this tab would; build it from a second
    // editor that is open on star.
    href = 'http://localhost:6969/edit.html?shader=star'
    const other = await start('STAR')
    other.editor.type('xyz')
    const edit = other.client.sent.find((m) => m.type === 'mp-edit')
    href = 'http://localhost:6969/edit.html?shader=plasma'
    client.onMessage(edit)
    expect(editor.getValue()).toBe('PLASMA')
  })

  it('still applies an edit made to the same shader', async () => {
    const { editor, client } = await start('PLASMA')
    const other = await start('PLASMA')
    other.editor.type('!')
    client.onMessage(other.client.sent.find((m) => m.type === 'mp-edit'))
    expect(editor.getValue()).toBe('PLASMA!')
  })
})
