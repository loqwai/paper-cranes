// The relay Worker serves the same guide as the dev server: wrangler bundles docs/vj-mcp-guide.md
// as a string (the Text rule in wrangler.jsonc). Build the real bundle and look for the guide in it.
import { it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = new URL('../../..', import.meta.url).pathname
const GUIDE = readFileSync(join(ROOT, 'docs/vj-mcp-guide.md'), 'utf-8')

it('bundles the guide markdown into the Worker', () => {
  const out = mkdtempSync(join(tmpdir(), 'relay-bundle-'))
  try {
    execFileSync('npx', ['wrangler', 'deploy', '--dry-run', '--config', 'workers/remote-relay/wrangler.jsonc', '--outdir', out], {
      cwd: ROOT, stdio: 'pipe', env: { ...process.env, CI: '1', WRANGLER_SEND_METRICS: 'false' },
    })
    const bundle = readdirSync(out, { recursive: true }).filter((f) => /\.(m?js|md|txt)$/.test(f)).map((f) => readFileSync(join(out, f), 'utf-8')).join('\n')
    // Lines from the orientation, a workflow and a topic, as written in the markdown.
    for (const needle of ['## hot-swap-shader: Swap or edit the shader without a reload', '## relay-room: ', '## signals: ']) {
      expect(GUIDE).toContain(needle)
      expect(bundle).toContain(needle)
    }
  } finally {
    rmSync(out, { recursive: true, force: true })
  }
}, 120_000)
