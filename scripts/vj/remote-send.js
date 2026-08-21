// remote-send — push an `update-params` command to the DISPLAY page from the shell.
// The display joins ws://<host>/ws when it has no ?room, and remote-ws-plugin broadcasts
// every message to the other clients. This is the vibej loop's lever on a display tab it
// cannot drive directly (a tab opened outside the session's Chrome tab group is unscriptable).
//   node scripts/vj/remote-send.js '{"noaudio":null}'      → deletes noaudio from the display URL
//   node scripts/vj/remote-send.js '{"knob_141":0.62}'     → pins a knob (null releases it)
import { WebSocket } from 'ws'

//   node scripts/vj/remote-send.js '{"text":"…"}' vj-learn-result   → any other hub message type
//     (the hub broadcasts every type to the other clients; the vjpad listens for vj-learn-result)
const port = process.env.PORT || 6969
const data = JSON.parse(process.argv[2] || '{}')
const type = process.argv[3] || 'update-params'
const ws = new WebSocket(`ws://localhost:${port}/ws`)

ws.on('open', () => {
  ws.send(JSON.stringify({ type, data }))
  setTimeout(() => { ws.close(); console.log('sent', type, JSON.stringify(data)) }, 300)
})
ws.on('error', e => { console.error('ws error', e.message); process.exit(1) })
