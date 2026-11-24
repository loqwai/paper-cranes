import { describe, it, expect } from 'vitest'
import { mergeShowParams, seedMidiProfiles, toSearch, withShowDefaults } from './params.js'

describe('toSearch', () => {
    const clit = { shader: 'claude/wip/clit-vibej/2', controllers: ['clit-set'], params: { wavelet: 'true', coaster: 1 } }

    it('keeps shader path slashes readable in the address bar', () => {
        expect(toSearch(mergeShowParams('', clit))).toBe('shader=claude/wip/clit-vibej/2&controller=clit-set&wavelet=true&coaster=1')
    })

    it('still encodes what must be encoded', () => {
        expect(toSearch(new URLSearchParams({ note: 'a&b c' }))).toBe('note=a%26b+c')
    })
})

const clit = {
    shader: 'claude/wip/clit-vibej/2',
    controllers: ['clit-set'],
    params: { wavelet: 'true', coaster: 1 },
}

describe('mergeShowParams', () => {
    it('boots the show from a bare URL', () => {
        const params = mergeShowParams('', clit)
        expect(params.get('shader')).toBe('claude/wip/clit-vibej/2')
        expect(params.getAll('controller')).toEqual(['clit-set'])
        expect(params.get('wavelet')).toBe('true')
        expect(params.get('coaster')).toBe('1')
    })

    it('lets the URL win over every default', () => {
        const params = mergeShowParams('?shader=other&controller=a&controller=b&coaster=0', clit)
        expect(params.get('shader')).toBe('other')
        expect(params.getAll('controller')).toEqual(['a', 'b'])
        expect(params.get('coaster')).toBe('0')
        expect(params.get('wavelet')).toBe('true')
    })

    it('keeps knobs the URL already carries', () => {
        expect(mergeShowParams('?knob_3=0.4', clit).get('knob_3')).toBe('0.4')
    })

    it('turns a room into a remote display', () => {
        expect(mergeShowParams('?room=s3cret', clit).get('remote')).toBe('display')
    })

    it('leaves an explicit remote mode alone', () => {
        expect(mergeShowParams('?room=s3cret&remote=control', clit).get('remote')).toBe('control')
    })

    it('opens no remote without a room', () => {
        expect(mergeShowParams('', clit).has('remote')).toBe(false)
    })

    it('is a no-op with an empty config (show.html on main)', () => {
        expect(mergeShowParams('?shader=x', {}).toString()).toBe('shader=x')
    })
})

describe('seedMidiProfiles', () => {
    const twister = { deviceName: 'Midi Fighter Twister', updatedAt: 'x', mappings: { 0: 1, 1: 2 } }

    it('installs the show profile in a fresh browser', () => {
        expect(seedMidiProfiles(null, { 'Midi Fighter Twister': twister })).toEqual({
            version: 1,
            profiles: { 'Midi Fighter Twister': twister },
        })
    })

    it('never overwrites a mapping this browser already has', () => {
        const mine = { deviceName: 'Midi Fighter Twister', updatedAt: 'y', mappings: { 0: 9 } }
        const stored = { version: 1, profiles: { 'Midi Fighter Twister': mine } }
        expect(seedMidiProfiles(stored, { 'Midi Fighter Twister': twister })).toBe(null)
    })

    it('adds only the devices that are missing', () => {
        const stored = { version: 1, profiles: { Other: { mappings: {} } } }
        const next = seedMidiProfiles(stored, { 'Midi Fighter Twister': twister })
        expect(Object.keys(next.profiles).sort()).toEqual(['Midi Fighter Twister', 'Other'])
    })
})

describe('withShowDefaults', () => {
    const at = (href) => new URL(href, 'https://show.test')
    const legacy = (href, config) => toSearch(mergeShowParams(at(href).search, config))
    const config = { shader: 'claude/wip/x/2', controllers: ['a', 'b'], params: { knob_3: 0.4 } }

    it.each(['/show.html', '/show.html?knob_3=0.9', '/show.html?room=abc', '/show.html?shader=y%2Fz&controller=c'])(
        'gives a query-only URL the same query as before: %s',
        (href) => expect(withShowDefaults(at(href), config)).toBe(legacy(href, config))
    )

    it('makes a hash room a display in that room', () => {
        const search = new URLSearchParams(withShowDefaults(at('/show.html?shader=x#room=abc'), {}))
        expect(search.get('remote')).toBe('display')
    })

    it('treats a key in the hash as already set by the URL', () => {
        const search = new URLSearchParams(withShowDefaults(at('/show.html#shader=mine&controller=c&knob_3=0.1'), config))
        expect(search.has('shader')).toBe(false)
        expect(search.has('controller')).toBe(false)
        expect(search.has('knob_3')).toBe(false)
    })
})
