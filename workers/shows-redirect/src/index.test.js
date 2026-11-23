import { describe, it, expect } from 'vitest'
import worker, { targetFor } from './index.js'

describe('targetFor', () => {
    it('sends a show path to its subdomain', () => {
        expect(targetFor('https://shows.beadfamous.com/clit')).toBe('https://clit.beadfamous.com/')
    })

    it('keeps the rest of the path and the query', () => {
        expect(targetFor('https://shows.beadfamous.com/clit/vjpad.html?room=x&shader=a/2'))
            .toBe('https://clit.beadfamous.com/vjpad.html?room=x&shader=a/2')
    })

    it('names no show for the root or a bad name', () => {
        expect(targetFor('https://shows.beadfamous.com/')).toBe(null)
        expect(targetFor('https://shows.beadfamous.com/Evil.com')).toBe(null)
    })
})

describe('fetch', () => {
    it('answers with a temporary redirect', () => {
        const res = worker.fetch(new Request('https://shows.beadfamous.com/clit'))
        expect([res.status, res.headers.get('location')]).toEqual([302, 'https://clit.beadfamous.com/'])
    })
})
