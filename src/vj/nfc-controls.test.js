import { describe, it, expect } from 'vitest'
import CONFIG from '../../nfc-show-controls.json'
import { idFromUrl, idFromRecords, resolveShow, planAction, createNfcControls, HAPTICS } from './nfc-controls.js'

const enc = (s) => new TextEncoder().encode(s)
const show = resolveShow(CONFIG, 'clit-set')

const harness = (over = {}) => {
  const sent = [], buzzed = [], store = new Map()
  let t = 0
  const nfc = createNfcControls({
    show,
    send: (m) => (sent.push(m), true),
    buzz: (p) => buzzed.push(p),
    storage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) },
    now: () => (t += 2000),
    ...over,
  })
  return { nfc, sent, buzzed, store }
}

describe('reading a sticker id', () => {
  it('takes the id from the URL the writer puts on tags, hash or query', () => {
    expect(idFromUrl('https://visuals.beadfamous.com/vjpad#nfc=s3')).toBe('s3')
    expect(idFromUrl('https://visuals.beadfamous.com/vjpad?nfc=s7')).toBe('s7')
  })

  it('refuses anything that is not a short id', () => {
    expect(idFromUrl('https://2cb.pw/clit-new/4')).toBe(null)
    expect(idFromUrl('https://x/vjpad#nfc=<script>')).toBe(null)
    expect(idFromUrl('not a url')).toBe(null)
  })

  it('reads url and text records as Web NFC hands them over (bytes)', () => {
    expect(idFromRecords([{ recordType: 'url', data: enc('https://visuals.beadfamous.com/vjpad#nfc=s2') }])).toBe('s2')
    expect(idFromRecords([{ recordType: 'text', encoding: 'utf-8', data: enc('nfc:s5') }])).toBe('s5')
    expect(idFromRecords([{ recordType: 'url', data: enc('https://2cb.pw/clit-new/9') }])).toBe(null)
  })
})

describe('the sticker map', () => {
  it('a show overrides the base map and brings its own beats and panic fork', () => {
    const s = resolveShow({ default: 'a', stickers: { s1: { do: 'keep' }, s2: { do: 'panic' } }, shows: { a: { stickers: { s2: { do: 'next' } }, beats: [{ shader: 'x' }] } } }, 'a')
    expect(s.stickers).toEqual({ s1: { do: 'keep' }, s2: { do: 'next' } })
    expect(s.beats).toEqual([{ shader: 'x' }])
  })

  it('beats come from setlists/<show>.json when the build has it', () => {
    const s = resolveShow(CONFIG, 'clit-set', { 'clit-set': { beats: [{ shader: 'from/setlist' }] } })
    expect(s.beats).toEqual([{ shader: 'from/setlist' }])
  })

  it('an unknown show falls back to the default', () => {
    expect(resolveShow(CONFIG, 'nope').name).toBe(CONFIG.default)
  })
})

describe('what a tap sends (docs/live-show-contract.md wire messages)', () => {
  it('KEEP and PANIC are the vjpad buttons\' messages, marked via nfc', () => {
    expect(planAction(show, 's1').messages).toEqual([{ type: 'vj-keep', data: {}, via: 'nfc' }])
    expect(planAction(show, 's2').messages).toEqual([{ type: 'vj-panic', data: {}, via: 'nfc' }])
  })

  it('PANIC names a fork only when the sticker does, never the show config\'s guess', () => {
    const s = { ...show, stickers: { p: { do: 'panic', fork: 'safe/1' } } }
    expect(planAction(s, 'p').messages[0].data).toEqual({ fork: 'safe/1' })
  })

  it('TAKE answers the newest open proposal, and does nothing when none is open', () => {
    expect(planAction(show, 's4', { proposal: 'p9' }).messages).toEqual([{ type: 'proposal-answer', data: { id: 'p9', take: true }, via: 'nfc' }])
    expect(planAction(show, 's4')).toMatchObject({ kind: 'empty', messages: [] })
  })

  it('NEXT walks the beats and stops at the end', () => {
    const first = planAction(show, 's3', { beat: -1 })
    expect(first.beat).toBe(0)
    expect(first.messages[0].data).toEqual({ shader: 'clit-set/2', knob_4: null, knob_5: null })
    expect(planAction(show, 's3', { beat: show.beats.length - 1 })).toMatchObject({ kind: 'empty', messages: [] })
  })

  it('NEXT reads a setlist beat that names its shader as `path` (sun-set), and skips none', () => {
    const s = { ...show, beats: [{ path: 'sun/10', params: { knob_1: 0.2 } }, { name: 'no shader' }] }
    expect(planAction(s, 's3').messages[0].data).toEqual({ knob_1: 0.2, shader: 'sun/10' })
    expect(planAction(s, 's3', { beat: 0 })).toMatchObject({ kind: 'empty', messages: [], beat: 0 })
  })

  it('a tag that is not on the map sends nothing', () => {
    expect(planAction(show, 's99')).toEqual({ kind: 'unknown', messages: [], beat: -1 })
  })
})

describe('the scanner', () => {
  it('a tap sends once and buzzes that action\'s pattern', () => {
    const { nfc, sent, buzzed } = harness()
    expect(nfc.fire('s2')).toBe('panic')
    expect(sent.map((m) => m.type)).toEqual(['vj-panic'])
    expect(buzzed).toEqual([HAPTICS.panic])
  })

  it('the same sticker read twice in a moment is one press (NEXT must not skip a beat)', () => {
    let t = 0
    const { nfc, sent } = harness({ now: () => (t += 200) })
    nfc.fire('s3')
    nfc.fire('s3')
    expect(sent).toHaveLength(1)
    expect(nfc.beat).toBe(0)
  })

  it('remembers the beat across reloads', () => {
    const { nfc, store } = harness()
    nfc.fire('s3')
    nfc.fire('s3')
    const again = harness({ storage: { getItem: (k) => store.get(k) ?? null, setItem: () => {} } })
    expect(again.nfc.beat).toBe(1)
  })

  it('offline: nothing is queued, and the buzz says so', () => {
    const { nfc, buzzed } = harness({ send: () => false })
    expect(nfc.fire('s1')).toBe('offline')
    expect(buzzed).toEqual([HAPTICS.offline])
  })

  it('TAKE follows the proposals the room announces, and takes each only once', () => {
    const { nfc, sent } = harness()
    nfc.onMessage({ type: 'proposal', data: { id: 'a' } })
    nfc.onMessage({ type: 'proposal', data: { id: 'b' } })
    nfc.onMessage({ type: 'proposal-clear', data: { id: 'b' } })
    nfc.fire('s4')
    expect(sent.at(-1).data).toEqual({ id: 'a', take: true })
    expect(nfc.fire('s4')).toBe('empty')
  })

  it('arms an NDEFReader and fires on its reading event', async () => {
    let reader
    class FakeReader extends EventTarget {
      constructor() { super(); reader = this }
      async scan() {}
    }
    const { nfc, sent } = harness({ Reader: FakeReader })
    await nfc.arm()
    expect(nfc.armed).toBe(true)
    const e = new Event('reading')
    e.message = { records: [{ recordType: 'url', data: enc('https://visuals.beadfamous.com/vjpad#nfc=s1') }] }
    reader.dispatchEvent(e)
    expect(sent.map((m) => m.type)).toEqual(['vj-keep'])
  })

  it('without Web NFC (iPhone, desktop) arming says why', async () => {
    const { nfc } = harness({ Reader: undefined })
    expect(nfc.supported).toBe(false)
    await expect(nfc.arm()).rejects.toThrow(/Android/)
  })
})

describe('the shipped map', () => {
  it('every sticker the writer writes (s1..s8) does something', () => {
    for (let i = 1; i <= 8; i++) expect(show.stickers[`s${i}`]?.do, `s${i}`).toBeTruthy()
  })
})
