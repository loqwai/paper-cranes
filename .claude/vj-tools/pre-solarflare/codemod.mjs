// Replace the camera-shutter blades with the SOLAR-FLARE surge in every set shader.
import { readFileSync, writeFileSync } from 'node:fs'

const SHUTTER = /    \/\/ SHUTTER: on a section change[\s\S]*?\n    if \(bs_shutter > 0\.001\) \{[\s\S]*?\n    \}\n/

const FLARE = `    // SOLAR-FLARE: on a section change the sun throws a flare surge (it replaced the camera-shutter
    // blades). The corona blooms out in soft radial streamers that turn forward on bs_shutterAng, the
    // limb flares hot gold, and a heat ripple travelling outward warps the streamer field (a
    // displacement, never a drawn ring). It peaks mid-envelope, hiding the resize, and is 0 between
    // events. Lighten-only blend, sun palette only (fixed OKLCH hues), local to ~1–2.5 radii.
    if (bs_shutter > 0.001) {
        float fe = bs_shutter * bs_shutter * (3.0 - 2.0 * bs_shutter);
        float rr = r / RH;
        float front = 1.0 + 1.5 * fe;
        float warp = 0.08 * fe * sin((rr - front) * 16.0) * exp(-pow((rr - front) / 0.4, 2.0));
        float rw = rr + warp;
        float ang = a - bs_shutterAng * TAU * 0.35;
        float streak = pow(0.5 + 0.5 * cos(ang * 7.0 + 1.4 * sin(ang * 3.0 + rw * 1.7)), 3.0);
        streak *= 0.55 + 0.45 * (0.5 + 0.5 * cos(ang * 17.0 - rw * 5.0 + bs_shutterAng * TAU));
        float reach = 1.0 + 1.5 * fe;
        float body = smoothstep(0.9, 1.05, rw) * (1.0 - smoothstep(reach * 0.75, reach, rw));
        float fall = exp(-max(rw - 1.0, 0.0) * 2.0);
        float limb = exp(-pow((rw - 1.0) / 0.12, 2.0)) * (0.35 + 0.65 * streak);
        vec3 hotGold = pow(gamutLch(vec3(0.84, 0.14, radians(82.0))), vec3(1.0 / 2.2));
        vec3 amber   = pow(gamutLch(vec3(0.70, 0.16, radians(60.0))), vec3(1.0 / 2.2));
        vec3 ember   = pow(gamutLch(vec3(0.52, 0.17, radians(38.0))), vec3(1.0 / 2.2));
        vec3 flareC = mix(mix(ember, amber, fall), hotGold, fall * fall);
        float glow = streak * body * fall * 0.5 + limb * 0.4;
        col = mix(col, max(col, flareC), clamp(glow * fe, 0.0, 0.85));
    }
`

for (const f of process.argv.slice(2)) {
  const src = readFileSync(f, 'utf8')
  if (!SHUTTER.test(src)) throw new Error(`no shutter block in ${f}`)
  writeFileSync(f, src.replace(SHUTTER, FLARE))
  console.log(`flare: ${f}`)
}
