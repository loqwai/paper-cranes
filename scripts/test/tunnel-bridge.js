// Does a phone on the public tunnel actually reach the display on localhost?
//
//   node scripts/test/tunnel-bridge.js <https-tunnel-url>
//
// Simulates the real show topology against the dev server's /ws:
//   display = ws://localhost:6969/ws   (secure context, mic works)
//   phone   = wss://<tunnel>/ws        (bypasses LAN client isolation)
// and asserts a control message sent by the phone lands on the display.

import WebSocket from 'ws'

const tunnel = process.argv[2]
if (!tunnel) {
    console.error('usage: node scripts/test/tunnel-bridge.js https://<sub>.trycloudflare.com')
    process.exit(1)
}
const wssUrl = tunnel.replace(/^https:/, 'wss:').replace(/\/$/, '') + '/ws'
const localUrl = 'ws://localhost:6969/ws'

const open = (url, label) =>
    new Promise((resolve, reject) => {
        const ws = new WebSocket(url)
        const seen = []
        ws.on('message', (m) => seen.push(m.toString()))
        ws.on('open', () => resolve({ ws, seen, label }))
        ws.on('error', (e) => reject(new Error(`${label} (${url}): ${e.message}`)))
        setTimeout(() => reject(new Error(`${label} (${url}): timed out`)), 15000)
    })

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const main = async () => {
    const display = await open(localUrl, 'display/localhost')
    console.log('✓ display connected on localhost')
    const phone = await open(wssUrl, 'phone/tunnel')
    console.log('✓ phone connected over the tunnel (wss)')

    await wait(500)
    const payload = JSON.stringify({
        type: 'update-params',
        data: { navZoom: 1.0, paletteShift: 0.62, warpGrow: 0.9 },
    })
    phone.ws.send(payload)
    await wait(1500)

    const got = display.seen.filter((m) => m.includes('"update-params"'))
    console.log(`display received: ${got.length} params message(s)`)
    if (got[0]) console.log(`  payload: ${got[0]}`)

    const ok = got.length === 1 && got[0] === payload
    ;[display, phone].forEach((c) => c.ws.close())
    console.log(ok ? '\nPASS — phone on tunnel drives display on localhost' : '\nFAIL')
    process.exit(ok ? 0 : 1)
}

main().catch((e) => {
    console.error('FAIL:', e.message)
    process.exit(1)
})
