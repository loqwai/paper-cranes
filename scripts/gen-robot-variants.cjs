#!/usr/bin/env node
// Generate robot NFC variants by rewriting the taco variants:
//   taco-N        → robot-N
//   image=images/taco.png         → image=images/robot-stencil.png
//   image=images/taco-stencil.png → image=images/robot-stencil.png
//   2cb.pw/taco-N → 2cb.pw/robot-N
// Writes shaders/redaphid/robot/nfc-variants.{json,md}.
//
// Re-run whenever the taco variants change.

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const SRC_JSON = path.join(ROOT, 'shaders/redaphid/taco/nfc-variants.json')
const DST_DIR = path.join(ROOT, 'shaders/redaphid/robot')
const DST_JSON = path.join(DST_DIR, 'nfc-variants.json')
const DST_MD = path.join(DST_DIR, 'nfc-variants.md')

const robotImage = 'images/robot-stencil.png'

const rewriteUrl = (url) =>
  url
    .replace(/image=images\/taco(-stencil)?\.png/g, `image=${robotImage}`)
    .replace(/taco-(\d+)/g, 'robot-$1')

const renameVariant = (v) => ({
  ...v,
  name: v.name.replace(/^taco-/, 'robot-'),
  short: v.short.replace(/\/taco-/, '/robot-'),
  full: rewriteUrl(v.full),
})

const taco = JSON.parse(fs.readFileSync(SRC_JSON, 'utf8'))
const robot = taco.map(renameVariant)

fs.mkdirSync(DST_DIR, { recursive: true })
fs.writeFileSync(DST_JSON, JSON.stringify(robot, null, 2) + '\n')

// Markdown table mirrors the taco doc layout.
const rows = robot
  .map((v) => {
    const cols = [v.n, v.shader, v.seed, v.seed2, v.seed3, v.seed4, v.knob_2 ?? '', v.knob_5 ?? '', '`' + v.short + '`']
    return '| ' + cols.join(' | ') + ' |'
  })
  .join('\n')

const md = `# Robot NFC Variants

50 variants for \`2cb.pw/robot-1\` … \`2cb.pw/robot-50\`. Mirrors the taco lineup
(\`shaders/redaphid/taco/nfc-variants.md\`) but swaps the mask image to
\`images/robot-stencil.png\` so each bracelet renders the robot silhouette
instead of the taco. Seeds, knobs, controller, and \`fft_size/smoothing\` are
identical to the matching \`taco-N\` so \`robot-N\` is the robot-mask twin of
\`taco-N\`.

**All variants force \`knob_7=0\`** (silhouette fits in frame; non-zero knob_7 cuts the figure off the edges).

**Audio responsiveness:** all variants include \`&fft_size=2048&smoothing=0.3\` for low-latency reactivity on phones.

To regenerate after the taco list changes: \`node scripts/gen-robot-variants.js\`.

| # | Shader | seed | seed2 | seed3 | seed4 | k_2 | k_5 | Short |
|---|--------|------|-------|-------|-------|-----|-----|-------|
${rows}
`

fs.writeFileSync(DST_MD, md)

console.log(`Wrote ${path.relative(ROOT, DST_JSON)} (${robot.length} entries)`)
console.log(`Wrote ${path.relative(ROOT, DST_MD)}`)
