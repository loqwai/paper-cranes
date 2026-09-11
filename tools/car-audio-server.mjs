// Single-origin server for the "stream my desktop audio to a parked car" setup.
//
// Serves two things on one port so there's no CORS / mixed-content to fight:
//   1. The built Paper Cranes app (dist/) as static files.
//   2. GET /desktop.mp3 — a live MP3 of your desktop audio, captured from a
//      Voicemeeter bus via ffmpeg (dshow).
//
// The Voicemeeter dshow device is SINGLE-OPEN: only one process can capture it
// at a time. So we run ONE persistent ffmpeg and fan its MP3 output out to every
// connected client. That lets your phone AND the car (AND test clients) all
// watch at once, and a client connecting/disconnecting never disturbs the
// capture. MP3 is a stream of self-syncing frames, so joining mid-stream works.
//
// Point a cloudflared tunnel at this, then on the phone/car open:
//   https://stream.hypnodroid.com/?shader=plasma&audio=https://stream.hypnodroid.com/desktop.mp3
//
// Config via env (all optional):
//   PORT           default 8080
//   AUDIO_DEVICE   dshow capture device (default: Voicemeeter Out B1)
//   FFMPEG         path to ffmpeg.exe
//   BITRATE        MP3 bitrate, default 128k

import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { readFile, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join, normalize, extname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = join(__dirname, '..', 'dist')

const PORT = parseInt(process.env.PORT ?? '8080')
const AUDIO_DEVICE = process.env.AUDIO_DEVICE ?? 'Voicemeeter Out B1 (VB-Audio Voicemeeter VAIO)'
const BITRATE = process.env.BITRATE ?? '128k'
const FFMPEG = process.env.FFMPEG ??
    'C:\\Users\\hypnodroid\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.2-full_build\\bin\\ffmpeg.exe'

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.frag': 'text/plain; charset=utf-8',
    '.glsl': 'text/plain; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.map': 'application/json; charset=utf-8',
    '.wasm': 'application/wasm',
}

// ---- one persistent ffmpeg, fanned out to all listeners -----------------------
const clients = new Set()
let ff = null
let restartTimer = null

const startFfmpeg = () => {
    if (ff) return
    // Tuned for SMOOTHNESS over latency (parked-car use: dropouts hurt, lag doesn't).
    //  -thread_queue_size / -rtbufsize : absorb capture bursts when the host CPU is
    //     busy (Moonlight video encode etc.) so samples aren't dropped.
    //  -af aresample=async=1 : soft-correct clock drift between the sound card and
    //     the encoder instead of producing gaps/glitches.
    //  (no -flush_packets: let MP3 mux in natural chunks → steadier network delivery
    //     and more browser-side buffer, which is what kills choppiness over the net.)
    const args = [
        '-hide_banner', '-loglevel', 'error',
        '-thread_queue_size', '4096', '-rtbufsize', '256M',
        '-f', 'dshow', '-i', `audio=${AUDIO_DEVICE}`,
        '-af', 'aresample=async=1:min_hard_comp=0.100000:first_pts=0',
        '-c:a', 'libmp3lame', '-b:a', BITRATE, '-ac', '2', '-ar', '44100',
        '-f', 'mp3', '-',
    ]
    ff = spawn(FFMPEG, args)
    console.log(`[capture] ffmpeg started pid ${ff.pid} (device: ${AUDIO_DEVICE})`)

    ff.stdout.on('data', (chunk) => {
        for (const res of clients) res.write(chunk)
    })
    ff.stderr.on('data', (d) => console.error('[ffmpeg]', d.toString().trim()))
    ff.on('exit', (code) => {
        console.log(`[capture] ffmpeg exited (${code}) — respawning`)
        ff = null
        // Always keep the capture warm so a client never waits on a cold start or
        // hits a restart gap. Respawn on any exit (device hiccup, Voicemeeter restart).
        if (!restartTimer) restartTimer = setTimeout(() => { restartTimer = null; startFfmpeg() }, 500)
    })
}

const handleStream = (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache, no-store',
        'Access-Control-Allow-Origin': '*',
        'Connection': 'keep-alive',
    })
    clients.add(res)
    console.log(`[stream] +client ${req.socket.remoteAddress} (${clients.size} total)`)

    const drop = () => {
        if (!clients.has(res)) return
        clients.delete(res)
        console.log(`[stream] -client (${clients.size} total)`)
    }
    req.on('close', drop)
    res.on('close', drop)
    res.on('error', drop)
}

// ---- static files from dist/ --------------------------------------------------
const serveStatic = async (urlPath, res) => {
    let clean = decodeURIComponent(urlPath.split('?')[0])
    if (clean === '/' || clean === '') clean = '/index.html'
    const filePath = normalize(join(DIST, clean))
    if (!filePath.startsWith(DIST)) { res.writeHead(403); return res.end('Forbidden') }

    try {
        const info = await stat(filePath)
        if (info.isDirectory()) return serveStatic(join(clean, 'index.html'), res)
        const body = await readFile(filePath)
        res.writeHead(200, { 'Content-Type': MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream' })
        res.end(body)
    } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain' })
        res.end('Not found')
    }
}

const server = createServer((req, res) => {
    if (req.url.split('?')[0] === '/desktop.mp3') return handleStream(req, res)
    return serveStatic(req.url, res)
})

server.listen(PORT, () => {
    console.log(`Paper Cranes + desktop audio serving on http://localhost:${PORT}`)
    console.log(`  app:    http://localhost:${PORT}/?shader=plasma`)
    console.log(`  stream: http://localhost:${PORT}/desktop.mp3`)
    console.log(`  device: ${AUDIO_DEVICE}`)
    startFfmpeg() // keep capture warm from boot — no cold start, no restart gaps
})
