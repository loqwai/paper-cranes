// End-to-end check of the remote relay: does a message from one client reach
// another client in the SAME room, and stay out of a DIFFERENT room?
//
//   node scripts/test/relay-roundtrip.js [host]
//
// Verifies the three things the show depends on:
//   1. both clients connect over wss
//   2. a params message from the "phone" arrives verbatim at the "display"
//   3. a client in another room hears nothing (rooms are isolated)
//   4. the sender does NOT get its own message echoed back

import WebSocket from 'ws'

const host = process.argv[2] || 'paper-cranes-remote.loqwai.workers.dev'
const room = 'selftest-' + process.pid
const url = (r) => `wss://${host}/ws/${encodeURIComponent(r)}`

const open = (r, label) =>
    new Promise((resolve, reject) => {
        const ws = new WebSocket(url(r))
        const seen = []
        ws.on('message', (m) => seen.push(m.toString()))
        ws.on('open', () => resolve({ ws, seen, label }))
        ws.on('error', reject)
        setTimeout(() => reject(new Error(`${label}: timed out connecting`)), 10000)
    })

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const main = async () => {
    console.log(`relay: wss://${host}  room: ${room}`)

    const display = await open(room, 'display')
    const phone = await open(room, 'phone')
    const stranger = await open(room + '-other', 'stranger')
    console.log('✓ all three clients connected')

    await wait(500)

    const payload = JSON.stringify({ type: 'params', data: { navZoom: 1.23, paletteShift: 0.62 } })
    phone.ws.send(payload)
    await wait(1200)

    const gotParams = display.seen.filter((m) => m.includes('"params"'))
    const echoed = phone.seen.filter((m) => m.includes('"params"'))
    const leaked = stranger.seen.filter((m) => m.includes('"params"'))
    const status = display.seen.filter((m) => m.includes('"status"'))

    console.log(`display received params : ${gotParams.length} ${gotParams[0] ?? ''}`)
    console.log(`sender echoed to itself : ${echoed.length} (want 0)`)
    console.log(`leaked to other room    : ${leaked.length} (want 0)`)
    console.log(`status messages         : ${status.length} ${status[status.length - 1] ?? ''}`)

    const ok =
        gotParams.length === 1 &&
        gotParams[0] === payload &&
        echoed.length === 0 &&
        leaked.length === 0 &&
        status.length > 0

    ;[display, phone, stranger].forEach((c) => c.ws.close())
    console.log(ok ? '\nPASS — relay is show-ready' : '\nFAIL — do not rely on this')
    process.exit(ok ? 0 : 1)
}

main().catch((e) => {
    console.error('FAIL:', e.message)
    process.exit(1)
})
