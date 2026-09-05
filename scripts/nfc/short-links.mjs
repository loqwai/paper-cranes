#!/usr/bin/env node
// Point the eleven 2cb.pw/mon-<shape> short links at a visual, via Cloudflare KV (wrangler).
//
//   node scripts/nfc/short-links.mjs                       # satellites on the mogee preview (the writer's default)
//   node scripts/nfc/short-links.mjs --shader hero --origin prod
//   node scripts/nfc/short-links.mjs --dry                 # print the mapping, write nothing
//   node scripts/nfc/short-links.mjs --verify              # only check what 2cb.pw redirects to now
//
// The beads carry ONLY the short link, so re-running this is how you change every bead at once
// (e.g. after merging mogee -> main, `--origin prod`). Caveat: the Worker answers 301, which
// Chrome caches per phone; a phone that already followed a slug keeps the old target until its
// cache expires. Needs `npx wrangler whoami` to succeed (OAuth login on this machine).
import { execSync } from 'node:child_process'

const NAMESPACE = 'e239df04697f45d78631c29760c1a5b9'   // 2cb.pw "short-urls" KV namespace
const SHORT_HOST = 'https://2cb.pw'
const BEADS = ['hakkaku', 'tomoe', 'kiku', 'ume', 'kikyo', 'kikko', 'matsukawa', 'mokko', 'ogi', 'suhama', 'katabami']
const ORIGINS = { preview: 'https://mogee.paper-cranes-visuals.pages.dev', prod: 'https://visuals.beadfamous.com' }
const img = b => `image=images/beads/mon-${b}.png`
// Keep in sync with SHADERS in nfc-writer.html
const SHADERS = {
  satellites: (o, b) => `${o}/?shader=redaphid/wip/lattice-bead-vj/satellites&controller=dodeca-bloom&${img(b)}&satellites=6&knob_1=0.75&knob_2=0.7&knob_3=0.6&wavelet=true&onset_refractory_ms=380&fullscreen=true`,
  hero:       (o, b) => `${o}/?shader=redaphid/wip/lattice-bead-vj/2&${img(b)}&controller=wavelet-ease&controller=lattice-nav&navZoom0=0.218&knob_1=0.429&knob_134=0.507&wavelet=true&fullscreen=true`,
  wall:       (o, b) => `${o}/?shader=redaphid/wip/lattice-bead-vj/1&controller=wavelet-ease&controller=lattice-nav&controller=lattice-controls&${img(b)}&knob_161=1&knob_168=1.0&knob_169=0.60&legible=1&navZoom0=0.14&wavelet=true&onset_refractory_ms=380&fullscreen=true`,
  spiral:     (o, b) => `${o}/?shader=redaphid/wip/lattice-bead-vj/spiral&${img(b)}&controller=dodeca-bloom&arms=2&beads=20&turns=1.6&wavelet=true&fullscreen=true`,
  grid:       (o, b) => `${o}/?shader=redaphid/wip/lattice-bead-vj/grid&controller=wavelet-ease&controller=lattice-nav&${img(b)}&wavelet=true&fullscreen=true`,
  chroma:     (o, b) => `${o}/?shader=redaphid/wip/lattice-bead-vj/chroma&controller=wavelet-ease&controller=lattice-nav&controller=lattice-controls&${img(b)}&knob_161=1&knob_168=1.0&knob_169=0.60&legible=1&navZoom0=0.14&wavelet=true&onset_refractory_ms=380&fullscreen=true`,
  'satellites-chroma': (o, b) => `${o}/?shader=redaphid/wip/lattice-bead-vj/satellites-chroma&controller=dodeca-bloom&${img(b)}&satellites=6&knob_1=0.75&knob_2=0.7&knob_3=0.6&wavelet=true&onset_refractory_ms=380&fullscreen=true`,
  'spiral-chroma': (o, b) => `${o}/?shader=redaphid/wip/lattice-bead-vj/spiral-chroma&${img(b)}&controller=dodeca-bloom&arms=2&beads=20&turns=1.6&wavelet=true&fullscreen=true`,
  'grid-chroma': (o, b) => `${o}/?shader=redaphid/wip/lattice-bead-vj/grid-chroma&controller=wavelet-ease&controller=lattice-nav&${img(b)}&wavelet=true&fullscreen=true`,
}

const args = process.argv.slice(2)
const opt = (name, dflt) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : dflt }
const shader = opt('shader', 'satellites'), origin = opt('origin', 'preview')
const dry = args.includes('--dry'), verifyOnly = args.includes('--verify')
if (!SHADERS[shader]) { console.error(`unknown shader ${shader}; one of ${Object.keys(SHADERS).join(', ')}`); process.exit(2) }
if (!ORIGINS[origin]) { console.error(`unknown origin ${origin}; one of ${Object.keys(ORIGINS).join(', ')}`); process.exit(2) }

const slug = b => `mon-${b}`
// shell:true is needed for npx on Windows, and cmd.exe splits unquoted arguments at every '&',
// so every argument that is not a plain word is wrapped in double quotes (URLs contain none).
const quote = x => (/^[\w.-]+$/.test(x) ? x : `"${x}"`)
const wrangler = (...a) => execSync(['npx', 'wrangler', 'kv', 'key', ...a.map(quote)].join(' '), { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
const location = async b => {
  try {
    const r = await fetch(`${SHORT_HOST}/${slug(b)}`, { redirect: 'manual' })
    return { status: r.status, to: r.headers.get('location') }
  } catch (e) { return { status: 'ERR', to: e.message } }
}

const plan = BEADS.map(b => ({ bead: b, slug: slug(b), short: `${SHORT_HOST}/${slug(b)}`, target: SHADERS[shader](ORIGINS[origin], b) }))
if (!verifyOnly) {
  console.log(`${dry ? 'DRY RUN: ' : ''}${shader} on ${origin} (${ORIGINS[origin]})`)
  for (const p of plan) {
    if (!dry) {
      try { wrangler('put', '--namespace-id', NAMESPACE, '--remote', p.slug, p.target) }
      catch (e) {
        // older wrangler has no --remote flag (remote was the default)
        if (/remote/.test(String(e.stderr || e.message))) wrangler('put', '--namespace-id', NAMESPACE, p.slug, p.target)
        else { console.error(`put failed for ${p.slug}:`, String(e.stderr || e.message).slice(0, 300)); process.exitCode = 1; continue }
      }
    }
    console.log(`  ${p.short}  ->  ${p.target}`)
  }
}
if (!dry) {
  console.log('verify (live redirects):')
  let bad = 0
  for (const p of plan) {
    const { status, to } = await location(p.bead)
    const ok = status >= 300 && status < 400 && to === p.target
    if (!ok && !verifyOnly) bad++
    console.log(`  ${ok ? 'OK ' : '?? '} ${p.short}  ${status}  ${to ?? ''}`)
  }
  if (bad) { console.log(`${bad} slug(s) do not match yet (KV can take a few seconds to propagate; re-run with --verify).`) }
}
