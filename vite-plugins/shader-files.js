// Reading and writing shaders/<name>.frag for the dev server: the /__save-shader endpoint
// (editor-sync-plugin) and the VJ MCP's read_shader/write_shader share this one path check.
import { readFile, writeFile, mkdir } from 'fs/promises'
import { resolve, dirname, sep } from 'path'

export const SHADER_DIR = 'shaders'

// "claude/wip/x/1" -> <root>/shaders/claude/wip/x/1.frag. Refuses anything that lands outside
// shaders/ (absolute paths, `..`), which the old string replace alone did not guarantee.
export const shaderFile = (root, shader) => {
  const normalized = String(shader ?? '').replace(/\.\./g, '').replace(/^\/+/, '').replace(/\.frag$/, '')
  if (!normalized) throw new Error('shader name required')
  const base = resolve(root, SHADER_DIR)
  const file = resolve(base, `${normalized}.frag`)
  if (!file.startsWith(base + sep)) throw new Error(`shader path escapes ${SHADER_DIR}/: ${shader}`)
  return { name: normalized, file, relative: `${SHADER_DIR}/${normalized}.frag` }
}

export const readShader = async (root, shader) => {
  const { name, file, relative } = shaderFile(root, shader)
  return { name, relative, code: await readFile(file, 'utf-8') }
}

export const saveShader = async (root, shader, code, { create = true } = {}) => {
  const { name, file, relative } = shaderFile(root, shader)
  if (create) await mkdir(dirname(file), { recursive: true })
  await writeFile(file, code, 'utf-8')
  return { name, relative, bytes: Buffer.byteLength(code) }
}
