// #207: a link to a shader the host does not have. Cloudflare (and Vite) answer a missing
// /shaders/x.frag with 200 and the site's index.html, so the page used to compile HTML as GLSL
// and show black with no error.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const INDEX_HTML = '<!doctype html>\n<html lang="en"><head><title>Paper Cranes</title></head></html>'
const DEFAULT_FRAG = '#version 300 es\n// the default shader\nvoid main(){}'

const files = {
  '/shaders/default.frag': { status: 200, body: DEFAULT_FRAG },
  '/shaders/real/1.frag': { status: 200, body: '// @fullscreen: true\nvoid main(){}' },
}

const fakeFetch = async (url) => {
  const file = files[url]
  if (file) return new Response(file.body, { status: file.status })
  return new Response(INDEX_HTML, { status: 200, headers: { 'content-type': 'text/html' } })
}

const appended = []
const stubPage = (search) => {
  appended.length = 0
  vi.stubGlobal('fetch', vi.fn(fakeFetch))
  vi.stubGlobal('window', { location: { search, pathname: '/' }, cranes: {} })
  vi.stubGlobal('localStorage', { getItem: () => null })
  vi.stubGlobal('document', {
    getElementById: () => null,
    createElement: () => ({ style: {}, setAttribute () {} }),
    body: { appendChild: (node) => appended.push(node) },
  })
}

describe('getRelativeOrAbsoluteShaderUrl', () => {
  beforeEach(() => stubPage(''))
  afterEach(() => vi.unstubAllGlobals())

  it('returns the shader source for a shader that exists', async () => {
    const { getRelativeOrAbsoluteShaderUrl } = await import('./utils.js')
    expect(await getRelativeOrAbsoluteShaderUrl('real/1')).toContain('void main')
  })

  it('refuses the web page a host serves in place of a missing shader', async () => {
    const { getRelativeOrAbsoluteShaderUrl } = await import('./utils.js')
    await expect(getRelativeOrAbsoluteShaderUrl('clit-vibej/2')).rejects.toThrow(/clit-vibej\/2/)
  })

  it('refuses a 404', async () => {
    files['/shaders/gone.frag'] = { status: 404, body: 'Not found' }
    const { getRelativeOrAbsoluteShaderUrl } = await import('./utils.js')
    await expect(getRelativeOrAbsoluteShaderUrl('gone')).rejects.toThrow(/404/)
  })
})

describe('getInitialShader with a missing ?shader=', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('falls back to the default shader and says so on the page, instead of rendering black', async () => {
    stubPage('?shader=clit-vibej/2')
    const { getInitialShader } = await import('./shaderLoader.js')
    const { code } = await getInitialShader()
    expect(code).toBe(DEFAULT_FRAG)
    expect(appended).toHaveLength(1)
    expect(appended[0].textContent).toContain('clit-vibej/2')
  })
})
