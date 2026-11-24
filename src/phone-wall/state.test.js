import { describe, it, expect } from 'vitest'
import { initialWall, stepWall, wallView } from './state.js'

const run = (...events) => events.reduce(stepWall, initialWall)

describe('phone wall state', () => {
  it('no display -> available -> presenting -> lost -> back', () => {
    let s = initialWall
    expect(s.state).toBe('none')
    s = stepWall(s, { type: 'screen', present: true })
    expect(s.state).toBe('available')
    s = stepWall(s, { type: 'project' })
    expect(s.state).toBe('connecting')
    s = stepWall(s, { type: 'linked', via: 'presentation' })
    expect(s).toMatchObject({ state: 'presenting', via: 'presentation' })
    s = stepWall(s, { type: 'unlinked' })
    expect(s.state).toBe('lost')
    s = stepWall(s, { type: 'screen', present: false })
    expect(s.state).toBe('lost') // the cable is out: still waiting for the wall
    s = stepWall(s, { type: 'linked' })
    expect(s).toMatchObject({ state: 'presenting', via: 'presentation' })
  })

  it('draws nothing on a phone with no second screen', () => {
    expect(wallView(initialWall)).toEqual({ chip: null, project: false, banner: false })
    expect(wallView(run({ type: 'screen', present: false }))).toEqual({ chip: null, project: false, banner: false })
  })

  it('offers PROJECT only while a second screen is seen', () => {
    expect(wallView(run({ type: 'screen', present: true })).project).toBe(true)
    expect(run({ type: 'screen', present: true }, { type: 'screen', present: false }).state).toBe('none')
  })

  it('a wall that links with no tap (opened on the external display by hand) is presenting', () => {
    expect(run({ type: 'linked', via: 'channel' })).toMatchObject({ state: 'presenting', via: 'channel' })
  })

  it('a failed PROJECT goes back to where it was', () => {
    expect(run({ type: 'screen', present: true }, { type: 'project' }, { type: 'failed' }).state).toBe('available')
    const lost = run({ type: 'linked' }, { type: 'unlinked' })
    expect(stepWall(stepWall(lost, { type: 'project' }), { type: 'failed' }).state).toBe('lost')
  })

  it('NO WALL shows the banner, and PROJECT again when the screen is back', () => {
    const lost = run({ type: 'screen', present: true }, { type: 'linked' }, { type: 'unlinked' })
    expect(wallView(lost)).toEqual({ chip: 'NO WALL', project: true, banner: true })
    expect(wallView(stepWall(lost, { type: 'screen', present: false }))).toEqual({ chip: 'NO WALL', project: false, banner: true })
  })

  it('dismiss stops waiting', () => {
    const lost = run({ type: 'linked' }, { type: 'unlinked' })
    expect(stepWall(lost, { type: 'dismiss' })).toMatchObject({ state: 'none', via: null })
  })

  it('ignores events that do not apply', () => {
    const s = run({ type: 'screen', present: true })
    expect(stepWall(s, { type: 'unlinked' })).toBe(s)
    expect(stepWall(s, { type: 'dismiss' })).toBe(s)
    expect(stepWall(initialWall, { type: 'project' })).toBe(initialWall)
  })
})
