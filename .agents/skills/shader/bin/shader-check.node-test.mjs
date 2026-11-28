// Regression test for shader-check.mjs's hard FAILs: four broken copies of silk-vortex/1 must each
// make it exit non-zero. Each copy is written to a temp dir and served with --frag (nothing lands in
// shaders/), then the dir is deleted. Needs a running instance (pc-verify launch) or SHADER_CHECK_BASE.
//
//   npm run test:shader-check
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const here = dirname(fileURLToPath(import.meta.url))
const repo = join(here, '..', '..', '..', '..')
const check = join(here, 'shader-check.mjs')
const original = readFileSync(join(repo, 'shaders', 'wip', 'silk-vortex', '1.frag'), 'utf8')
const OUT = 'fragColor = vec4(lin2srgb(col), 1.0);'
const tmp = mkdtempSync(join(tmpdir(), 'shader-check-test-'))
after(() => rmSync(tmp, { recursive: true, force: true }))

// Each variant must fail for its own reason, not because the page broke.
const expected = {
  'white-when-loud': /white-out|brightness pump/,
  'static-in-silence': /alive in silence/,
  'brighter-when-quiet': /quiet is not brighter than loud/,
  black: /black/,
}

const broken = {
  // Loud (energy 0.05) turns the whole frame white; quiet (0.006) is untouched.
  'white-when-loud': (s) => s.replace(OUT, 'fragColor = vec4(mix(lin2srgb(col), vec3(1.0), step(0.03, energy)), 1.0);'),
  // Every clock held at 0: nothing moves in silence.
  'static-in-silence': (s) => s.replace(/#define TRAVEL .*/, '#define TRAVEL 0.0').replace(/#define ROLL .*/, '#define ROLL 0.0').replace(/#define WEAVE .*/, '#define WEAVE 0.0'),
  // Five times brighter whenever the room is quiet.
  'brighter-when-quiet': (s) => s.replace(OUT, 'fragColor = vec4(clamp(lin2srgb(col) * (energy < 0.02 ? 5.0 : 1.0), 0.0, 1.0), 1.0);'),
  black: (s) => s.replace(OUT, 'fragColor = vec4(0.0, 0.0, 0.0, 1.0);'),
}

for (const [name, mutate] of Object.entries(broken)) {
  test(`shader-check exits non-zero on ${name}`, () => {
    const src = mutate(original)
    assert.notEqual(src, original, `${name}: the mutation did not apply`)
    const file = join(tmp, `${name}.frag`)
    writeFileSync(file, src)
    const args = [check, '--shader', `wip/__shader-check-test/${name}`, '--frag', file, '--knobs', 'none', '--times', '3']
    if (process.env.SHADER_CHECK_BASE) args.push('--base', process.env.SHADER_CHECK_BASE)
    const r = spawnSync(process.execPath, args, { cwd: repo, encoding: 'utf8', timeout: 300_000 })
    const fails = r.stdout.split('\n').filter((l) => l.startsWith('FAIL'))
    console.log(`${name}: exit ${r.status}; ${fails.join(' | ') || r.stderr.slice(-300)}`)
    assert.notEqual(r.status, 0, `${name} passed shader-check:\n${r.stdout}`)
    assert.ok(!fails.some((l) => /^FAIL (run|.* page errors)/.test(l)), `${name} broke the page or the run rather than failing a check:\n${r.stdout}${r.stderr}`)
    assert.ok(fails.some((l) => expected[name].test(l)), `${name} did not FAIL ${expected[name]}:\n${r.stdout}`)
  })
}
