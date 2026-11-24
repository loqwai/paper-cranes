import { describe, it, expect } from 'vitest'
import { mergeUrlParams, withUrlParams } from './url.js'

const merged = (href) => mergeUrlParams(new URL(href, 'https://x.test'))
const entries = (href) => [...merged(href).entries()]

const legacyWrite = (href, changes) => {
  const url = new URL(href, 'https://x.test')
  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === undefined) url.searchParams.delete(key)
    else url.searchParams.set(key, value)
  }
  return url.toString()
}

const LEGACY_URLS = [
  '/',
  '/?shader=wip/plasma&knob_1=0.5&bassNormalized=0.2',
  '/?shader=redaphid/wip/clit/3&controller=wavelet-ease&controller=lattice-nav&noaudio=true',
  '/?audio_file=test-audio/song.mp3&audio_time=27.5&fft_size=8192&smoothing=0.5',
  '/?image=images%2Frezz.png&knob_3.min=-1&knob_3.max=2&name=a+b%20c',
  '/edit.html?shader=x&present&open_sliders=true',
]

describe('mergeUrlParams', () => {
  it.each(LEGACY_URLS)('reads a query-only URL exactly as URLSearchParams(search) did: %s', (href) => {
    const url = new URL(href, 'https://x.test')
    expect(entries(href)).toEqual([...new URLSearchParams(url.search).entries()])
  })

  it('reads params that live only in the hash', () => {
    expect(merged('/#shader=foo').get('shader')).toBe('foo')
  })

  it('merges query and hash keys', () => {
    const params = merged('/?shader=foo#knob_1=0.5&bassNormalized=0.2')
    expect(params.get('shader')).toBe('foo')
    expect(params.get('knob_1')).toBe('0.5')
    expect(params.get('bassNormalized')).toBe('0.2')
  })

  it('lets the hash win when a key is in both places', () => {
    expect(merged('/?knob_1=0.2#knob_1=0.8').get('knob_1')).toBe('0.8')
  })

  it('replaces every query value of a repeated key with the hash values, in hash order', () => {
    const params = merged('/?controller=a&controller=b#controller=c&controller=d')
    expect(params.getAll('controller')).toEqual(['c', 'd'])
  })

  it('treats an empty hash as no params', () => {
    expect(entries('/?a=1#')).toEqual([['a', '1']])
  })

  it('decodes hash values the way the query decodes them', () => {
    expect(merged('/#image=images%2Frezz.png&name=a+b').get('image')).toBe('images/rezz.png')
    expect(merged('/#name=a+b').get('name')).toBe('a b')
  })
})

describe('withUrlParams', () => {
  it.each(LEGACY_URLS)('writes a query-only URL exactly as the old searchParams writers did: %s', (href) => {
    const changes = { knob_1: 0.7, shader: 'other', bassNormalized: null }
    expect(withUrlParams(new URL(href, 'https://x.test').href, changes).toString()).toBe(legacyWrite(href, changes))
  })

  it('updates a key in the hash when it lives there', () => {
    const url = withUrlParams('https://x.test/?shader=foo#knob_1=0.5', { knob_1: 0.7 })
    expect(url.search).toBe('?shader=foo')
    expect(url.hash).toBe('#knob_1=0.7')
  })

  it('keeps a query key in the query even when the hash holds params', () => {
    const url = withUrlParams('https://x.test/?shader=foo#knob_1=0.5', { shader: 'bar' })
    expect(url.search).toBe('?shader=bar')
    expect(url.hash).toBe('#knob_1=0.5')
  })

  it('writes the hash copy when a key is in both places, so the written value is the one read back', () => {
    const url = withUrlParams('https://x.test/?knob_1=0.2#knob_1=0.8', { knob_1: 0.9 })
    expect(mergeUrlParams(url).get('knob_1')).toBe('0.9')
  })

  it('puts a new key in the hash when the hash already holds params', () => {
    const url = withUrlParams('https://x.test/?shader=foo#knob_1=0.5', { knob_2: 0.1 })
    expect(url.search).toBe('?shader=foo')
    expect(url.hash).toBe('#knob_1=0.5&knob_2=0.1')
  })

  it('puts a new key in the query when there is no hash', () => {
    expect(withUrlParams('https://x.test/?shader=foo', { knob_2: 0.1 }).search).toBe('?shader=foo&knob_2=0.1')
  })

  it('deletes a key from both places, so no stale query value shows through', () => {
    const url = withUrlParams('https://x.test/?knob_1=0.2#knob_1=0.8&knob_2=1', { knob_1: null })
    expect(mergeUrlParams(url).has('knob_1')).toBe(false)
    expect(url.hash).toBe('#knob_2=1')
  })

  it('leaves the hash byte-for-byte alone when no hash key changes', () => {
    const url = withUrlParams('https://x.test/?a=1#b=a%20b&c', { a: 2 })
    expect(url.hash).toBe('#b=a%20b&c')
  })
})
