import { describe, it, expect, afterEach, vi } from 'vitest'
import { shaderOnScreen } from './shaderLoader.js'

const visit = (href) => vi.stubGlobal('window', { location: new URL(href, 'https://x.test') })

describe('shaderOnScreen', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('reads the shader from the query', () => {
    visit('/?shader=plasma')
    expect(shaderOnScreen()).toBe('plasma')
  })

  it('reads a shader given in the hash', () => {
    visit('/#shader=plasma')
    expect(shaderOnScreen()).toBe('plasma')
  })

  it('lets the hash win over the query', () => {
    visit('/?shader=rain#shader=plasma')
    expect(shaderOnScreen()).toBe('plasma')
  })
})
