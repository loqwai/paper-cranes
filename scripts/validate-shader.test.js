import { describe, it, expect } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

const CLI = new URL('./validate-shader.js', import.meta.url).pathname

// The CLI exits 1 on a bad shader; return its output either way.
const validate = async (source) => {
  const file = join(await mkdtemp(join(tmpdir(), 'validate-shader-')), 'bad.frag')
  await writeFile(file, source)
  try {
    const { stdout } = await promisify(execFile)(process.execPath, [CLI, file])
    return { code: 0, out: stdout }
  } catch (err) {
    return { code: err.code, out: `${err.stdout}${err.stderr}` }
  }
}

describe('validate-shader error line numbers', () => {
  it('points at the right line of a #version shader', async () => {
    const { code, out } = await validate('#version 300 es\nprecision highp float;\nout vec4 fragColor;\nvoid main(){ fragColor = vec4(foo, 1.0); }\n')
    expect(code).toBe(1)
    expect(out).toMatch(/Line 4: 'foo' : undeclared identifier/)
  }, 30_000)

  it('points at the right line of a mainImage shader', async () => {
    const { code, out } = await validate('void mainImage(out vec4 fragColor, in vec2 fragCoord) {\n  float x = 1.0;\n  fragColor = vec4(bar);\n}\n')
    expect(code).toBe(1)
    expect(out).toMatch(/Line 3: 'bar' : undeclared identifier/)
  }, 30_000)
})
