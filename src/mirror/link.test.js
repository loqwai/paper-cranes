import { describe, it, expect } from 'vitest'
import { mirrorLink, mirrorSettings } from './link.js'

const VIEW = 'ab'.repeat(32)

describe('mirror link', () => {
  it('opens the relay\'s view socket, never a room socket', () => {
    expect(mirrorSettings(`?view=${VIEW}`)).toEqual({ socketUrl: `wss://relay.beadfamous.com/view/${VIEW}`, scale: 0.5, fps: 30 })
    expect(mirrorSettings(`?view=${VIEW}&relay=127.0.0.1:7171&scale=0.25&fps=15`).socketUrl).toBe(`ws://127.0.0.1:7171/view/${VIEW}`)
  })

  it('refuses a page with no valid view id', () => {
    expect(mirrorSettings('?room=show-night')).toBeNull()
    expect(mirrorSettings('?view=../ws/show-night')).toBeNull()
    expect(mirrorSettings(`?view=${VIEW.toUpperCase()}`)).toBeNull()
  })

  it('keeps scale and fps inside what a phone can carry', () => {
    expect(mirrorSettings(`?view=${VIEW}&scale=4&fps=240`)).toMatchObject({ scale: 0.5, fps: 30 })
    expect(mirrorSettings(`?view=${VIEW}&scale=&fps=abc`)).toMatchObject({ scale: 0.5, fps: 30 })
  })

  it('builds a link with no room name and no display secret in it', () => {
    const link = mirrorLink({ view: VIEW, scale: 0.5 })
    expect(link).toBe(`https://visuals.beadfamous.com/mirror.html?view=${VIEW}&scale=0.5`)
    expect(link).not.toMatch(/room|secret/)
  })
})
