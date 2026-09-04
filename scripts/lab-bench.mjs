// Uncapped GPU cost benchmark for the lattice-bead split arms.
// Renders the SAME wrapped shader offscreen at a fixed high resolution, many draws,
// timed with a readPixels sync point -> ms/frame independent of vsync and of the
// app's dynamic resolution scaler.
//   node scripts/lab-bench.mjs <frag-path> <label:knob161:knob162> ...
import { chromium } from 'playwright'

const PORT = 6986
const [frag, ...arms] = process.argv.slice(2)
const browser = await chromium.launch({ headless: false })
const page = await browser.newPage({ viewport: { width: 600, height: 400 } })
page.on('pageerror', e => console.error('PAGEERROR', e.message))
await page.goto(`http://localhost:${PORT}/?noaudio=true`, { waitUntil: 'load' })
if (await page.evaluate(() => location.port) !== String(PORT)) throw new Error('PORT GUARD FAILED')

const out = await page.evaluate(async ({ frag, arms }) => {
    const mod = await import('/src/shader-transformers/shader-wrapper.js')
    const src = await (await fetch('/' + frag)).text()
    const wrapped = mod.shaderWrapper(src)

    const N = 2048
    const cv = Object.assign(document.createElement('canvas'), { width: 8, height: 8 })
    const gl = cv.getContext('webgl2')
    const vs = gl.createShader(gl.VERTEX_SHADER)
    gl.shaderSource(vs, `#version 300 es
in vec2 a; void main(){ gl_Position = vec4(a,0.,1.); }`)
    gl.compileShader(vs)
    const fs = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(fs, wrapped); gl.compileShader(fs)
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) return { error: gl.getShaderInfoLog(fs) }
    const pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr)
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return { error: gl.getProgramInfoLog(pr) }
    gl.useProgram(pr)

    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    // real 1024x1024 bead SDF texture on unit 0 (samplers default to 0)
    const img = new Image(); img.src = '/images/beads/mon-kiku.png'; await img.decode()
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)

    const rt = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, rt)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, N, N, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, rt, 0)
    gl.viewport(0, 0, N, N)
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex)

    const U = n => gl.getUniformLocation(pr, n)
    gl.uniform3f(U('iResolution'), N, N, 1.0)
    gl.uniform1f(U('iTime'), 8.0)
    gl.uniform1f(U('time'), 8.0)
    gl.uniform1f(U('knob_1'), 0.429)
    gl.uniform1f(U('knob_134'), 0.507)
    gl.uniform1f(U('knob_144'), 0.3)
    gl.uniform1f(U('navZoom'), 0.218)

    const px = new Uint8Array(4)
    const run = (k161, k162, k163, iters) => {
        gl.uniform1f(U('knob_161'), k161)
        gl.uniform1f(U('knob_162'), k162)
        gl.uniform1f(U('knob_163'), k163)
        for (let i = 0; i < 5; i++) gl.drawArrays(gl.TRIANGLES, 0, 3)   // warm
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px)
        const t0 = performance.now()
        for (let i = 0; i < iters; i++) gl.drawArrays(gl.TRIANGLES, 0, 3)
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px)   // sync point
        return (performance.now() - t0) / iters
    }
    const res = {}
    const spec = arms.map(a => { const [label,k161,k162,k163] = a.split(':')
        return { label, k161:+k161, k162:+k162, k163:+(k163||0) } })
    // Global warm-up FIRST (every arm), then INTERLEAVE rounds. Running arms in
    // sequence made whichever arm went first look slow: 5 warm draws do not cover
    // GPU clock ramp, so arm-order aliased onto the result.
    for (const a of spec) run(a.k161, a.k162, a.k163, 40)
    const bag = {}; spec.forEach(a => bag[a.label] = [])
    for (let r = 0; r < 9; r++) for (const a of spec) bag[a.label].push(run(a.k161, a.k162, a.k163, 60))
    for (const a of spec) {
        const s2 = bag[a.label].sort((x, y) => x - y)
        res[a.label] = { medianMsPerFrame: +s2[4].toFixed(3),
                         p25: +s2[2].toFixed(3), p75: +s2[6].toFixed(3),
                         min: +s2[0].toFixed(3), max: +s2[8].toFixed(3) }
    }
    const dbg = gl.getExtension('WEBGL_debug_renderer_info')
    return { res, N, renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'n/a' }
}, { frag, arms })

console.log(JSON.stringify(out, null, 2))
await browser.close()
