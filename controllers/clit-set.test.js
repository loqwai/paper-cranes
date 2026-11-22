import { describe, it, expect } from 'vitest'
import { fresh, step, place, nav, loopDelta, steer, WAYPOINTS, LEG_SECS, LOOP_SECS, legSecs, LZ_CAP, STEER_LIMIT } from './clit-set.js'

const run = (S, f, secs, dt = 1 / 60) => {
  let out
  for (let t = 0; t < secs; t += dt) out = step(S, f, dt)
  return out
}

const HOME = WAYPOINTS[0]
const loud = { energy: 0.3, energyNormalized: 0.9, energyZScore: 0.8, bassZScore: 0.9, spectralCentroidZScore: 1.2 }
const quiet = { energy: 0, energyNormalized: 0.1 }

describe('clit-set controller navigation', () => {
  it('opens at home with every knob at 0', () => {
    const out = step(fresh(), {}, 1 / 60)
    expect(out.cs_cx).toBeCloseTo(HOME.cx)
    expect(out.cs_cy).toBeCloseTo(HOME.cy)
    expect(out.cs_lz).toBeCloseTo(0)
    expect(out.cs_navA).toBeCloseTo(HOME.A)
    expect(out.cs_navB).toBeCloseTo(HOME.B)
  })

  it('audio never moves the camera or the fractal shape, it only changes the clock rates', () => {
    const SA = fresh(), SB = fresh()
    const a = run(SA, loud, 8)
    const b = run(SB, quiet, 8)
    // the shape sits on the clock-driven path (loud only moves along it faster)
    for (const [S, o] of [[SA, a], [SB, b]]) for (const k of ['A', 'B', 'curl']) expect(Math.abs(o[`cs_nav${k === 'curl' ? '' : k}`.replace('cs_nav', k === 'curl' ? 'cs_curl' : 'cs_nav')] - place(S.voyage)[k])).toBeLessThan(0.02)
    // loud music spins faster, never backwards
    expect(a.cs_drift).toBeGreaterThan(b.cs_drift)
    expect(b.cs_drift).toBeGreaterThan(0)
    // and the camera sits on the clock-driven path either way (nav takes no audio)
    const k0 = Array(16).fill(0)
    for (const [S, o] of [[SA, a], [SB, b]]) {
      const t = nav(k0, S.voyage, S.drift)
      expect(Math.abs(o.cs_cx - t.cx) + Math.abs(o.cs_cy - t.cy) + Math.abs(o.cs_lz - t.lz)).toBeLessThan(0.03)
      expect(Math.abs(o.cs_rot - t.rot)).toBeLessThan(0.03)
    }
    expect(a.cs_breath).toBeGreaterThan(b.cs_breath)
  })

  it('at k=0 the camera visibly moves every second for a whole loop (never parked)', () => {
    const S = fresh()
    let prev = run(S, quiet, 2)
    for (let s = 0; s < LOOP_SECS + 20; s++) {
      const out = run(S, quiet, 1, 1 / 30)
      const moved = Math.abs(out.cs_cx - prev.cs_cx) + Math.abs(out.cs_cy - prev.cs_cy) + Math.abs(out.cs_lz - prev.cs_lz) + Math.abs(out.cs_rot - prev.cs_rot)
      expect(moved).toBeGreaterThan(0.004)
      prev = out
    }
  })

  it('geometry only evolves: at k=0 the spin never reverses and each coordinate turns round at most at a waypoint', () => {
    const S = fresh()
    let prev = run(S, quiet, 1)
    const turns = { cx: 0, cy: 0, lz: 0 }, sign = {}
    for (let s = 0; s < LOOP_SECS; s++) {
      const out = run(S, s % 30 < 15 ? loud : quiet, 1, 1 / 30)
      expect(out.cs_rot).toBeGreaterThan(prev.cs_rot)
      for (const k of Object.keys(turns)) {
        const d = out[`cs_${k}`] - prev[`cs_${k}`]
        if (Math.abs(d) < 1e-6) continue
        if (sign[k] && Math.sign(d) !== sign[k]) turns[k]++
        sign[k] = Math.sign(d)
      }
      prev = out
    }
    for (const k of Object.keys(turns)) expect(turns[k]).toBeLessThanOrEqual(WAYPOINTS.length)
  })

  it('the voyage index stays in 0..WAYPOINTS.length and cs_jump never stands in for it', () => {
    const S = fresh()
    for (let s = 0; s < LOOP_SECS * 2.5; s += 5) {
      const out = run(S, s % 40 < 20 ? loud : quiet, 5, 0.05)
      expect(out.cs_voyage).toBeGreaterThanOrEqual(0)
      expect(out.cs_voyage).toBeLessThan(WAYPOINTS.length)
    }
    for (const u of [-0.001, 0, 5.999, 6, 6.001, 11.5, -7.2]) for (const v of Object.values(place(u))) expect(Number.isFinite(v)).toBe(true)
  })

  it('autopilot leaves home and comes back after one full loop', () => {
    const S = fresh()
    const QUIET_PACE = 0.5   // silence flies the voyage at half speed
    const mid = run(S, quiet, (legSecs(0) + legSecs(1) + legSecs(2) * 0.2) / QUIET_PACE, 0.05)
    expect(Math.abs(mid.cs_cx - HOME.cx) + Math.abs(mid.cs_cy - HOME.cy) + Math.abs(mid.cs_navA - HOME.A)).toBeGreaterThan(0.1)
    const back = run(S, quiet, (LOOP_SECS - (legSecs(0) + legSecs(1) + legSecs(2) * 0.2)) / QUIET_PACE + 10, 0.05)
    expect(S.voyage).toBeLessThan(0.2)
    expect(back.cs_cx).toBeCloseTo(HOME.cx, 2)
    expect(back.cs_navA).toBeCloseTo(HOME.A, 1)
  })

  it('THROTTLE dives forward one way, faster the further the dial is up', () => {
    const slow = fresh(), fast = fresh()
    run(slow, { ...quiet, knob_4: 0.3 }, 3)
    run(fast, { ...quiet, knob_4: 1 }, 3)
    expect(fast.dive).toBeGreaterThan(slow.dive * 2)
    let prev = 0
    const S = fresh()
    for (let i = 0; i < 300; i++) {
      const out = step(S, { ...quiet, knob_4: 0.5 }, 1 / 60)
      expect(out.cs_dive).toBeGreaterThanOrEqual(prev - 1e-9)
      prev = out.cs_dive
    }
  })

  it('at the depth cap the coaster climbs back out while the voyage moves on to new terrain', () => {
    const S = fresh()
    let maxLz = 0, climbed = false, v0 = null
    for (let t = 0; t < 30; t += 1 / 60) {
      const out = step(S, { ...quiet, knob_4: 1 }, 1 / 60)
      maxLz = Math.max(maxLz, out.cs_lz)
      if (out.cs_climb > 0 && v0 === null) { v0 = S.voyage; climbed = true }
    }
    expect(climbed).toBe(true)
    expect(maxLz).toBeLessThan(LZ_CAP + 0.05)
    expect(loopDelta(v0, S.voyage, WAYPOINTS.length)).toBeGreaterThan(0)
  })

  it('STEER is a turn rate: 0.5 and an untouched 0 go straight, off-centre keeps carving to the wall', () => {
    expect(steer(0)).toBe(0)
    expect(steer(0.5)).toBe(0)
    expect(steer(0.53)).toBe(0)
    expect(steer(1)).toBeCloseTo(1, 6)
    expect(steer(0.1)).toBeLessThan(-0.5)
    const idle = fresh()
    const a = run(idle, quiet, 4)
    expect(Math.abs(idle.panX) + Math.abs(idle.panY)).toBe(0)
    const S = fresh()
    const p1 = run(S, { ...quiet, knob_1: 1 }, 2).cs_cy - place(S.voyage).cy
    const p2 = run(S, { ...quiet, knob_1: 1 }, 2).cs_cy - place(S.voyage).cy
    expect(p2).toBeGreaterThan(p1)
    run(S, { ...quiet, knob_1: 1 }, 20)
    expect(S.panX).toBeCloseTo(STEER_LIMIT, 6)
    expect(a.cs_cy).toBeCloseTo(nav(Array(16).fill(0), idle.voyage).cy, 1)
  })

  it('a drop surges the dive forward, more at a higher throttle', () => {
    const drop = { energy: 0.3, energyNormalized: 0.9, energyZScore: 0.9, bassZScore: 0.9 }
    const hover = fresh(), full = fresh()
    for (const S of [hover, full]) run(S, quiet, 7)
    run(hover, { ...drop, knob_4: 0 }, 0.5)
    run(full, { ...drop, knob_4: 1 }, 0.5)
    expect(hover.surge).toBe(0)
    expect(full.surge).toBeGreaterThan(hover.surge)
  })

  it('VOYAGE blends along the shorter way round the loop', () => {
    const n = WAYPOINTS.length
    expect(loopDelta(5.9, 0.1, n)).toBeCloseTo(0.2, 9)
    expect(loopDelta(0.1, 5.9, n)).toBeCloseTo(-0.2, 9)
    expect(loopDelta(1, 2.5, n)).toBeCloseTo(1.5, 9)
    // Autopilot at 5.9 (gliding into home), VOYAGE parked mid-blend toward home (scrub 0):
    // the blend stays between 5.9 and 6 ≡ home, never sweeping back through waypoints 4, 3, 2, 1.
    const k = Array(16).fill(0)
    const auto = nav(k, 5.9)
    const home = nav(k, 0)
    for (const k3 of [0.01, 0.02, 0.04, 0.06, 0.08]) {
      k[2] = k3
      const p = nav(k, 5.9)
      for (const key of ['cx', 'cy', 'A', 'B']) {
        expect(p[key]).toBeGreaterThanOrEqual(Math.min(auto[key], home[key]) - 1e-9)
        expect(p[key]).toBeLessThanOrEqual(Math.max(auto[key], home[key]) + 1e-9)
      }
    }
  })

  it('VOYAGE past 8% scrubs the loop by hand, 0.08 = home', () => {
    const k = Array(16).fill(0)
    k[2] = 0.08
    expect(nav(k, 3.3).cx).toBeCloseTo(WAYPOINTS[0].cx, 6)
    expect(nav(k, 3.3).A).toBeCloseTo(WAYPOINTS[0].A, 6)
  })

  it('crest and kurtosis reach the shader eased, not raw', () => {
    const S = fresh()
    run(S, quiet, 1)
    const live = { energy: 0.3, energyNormalized: 0.5 }
    run(S, live, 2)
    const a = step(S, { ...live, spectralCrestNormalized: 1, spectralKurtosisZScore: 1 }, 1 / 60)
    expect(a.cs_pearl).toBeLessThan(0.2)
    expect(a.cs_focus).toBeLessThan(0.05)
    const b = run(S, { ...live, spectralCrestNormalized: 1, spectralKurtosisZScore: 1 }, 4)
    expect(b.cs_pearl).toBeGreaterThan(0.8)
    expect(b.cs_focus).toBeGreaterThan(0.8)
  })

  it('voyage0 starts the journey at a waypoint and wraps', () => {
    const out = step(fresh(), { voyage0: 2 + WAYPOINTS.length * 3 }, 1 / 60)
    expect(out.cs_cx).toBeCloseTo(WAYPOINTS[2].cx)
    expect(out.cs_navA).toBeCloseTo(WAYPOINTS[2].A)
  })

  it('every place along the loop is finite', () => {
    for (let u = -1; u < WAYPOINTS.length + 1; u += 0.1) for (const v of Object.values(place(u))) expect(Number.isFinite(v)).toBe(true)
  })
})

describe('clit-set shape pacing and beat', () => {
  it('a leg lasts longer the further the shape travels, never shorter than LEG_SECS', () => {
    for (let i = 0; i < WAYPOINTS.length; i++) expect(legSecs(i)).toBeGreaterThanOrEqual(LEG_SECS)
    expect(legSecs(5)).toBeGreaterThan(legSecs(0) * 2)   // rose carpet → home: power 2.45 → 1.5
  })

  it('the shape never morphs faster than 0.004 power per second along the loop', () => {
    const S = fresh()
    let prev = run(S, quiet, 2)
    for (let t = 0; t < LOOP_SECS; t += 1) {
      const out = run(S, quiet, 1, 1 / 20)
      expect(Math.abs(out.cs_navA - prev.cs_navA)).toBeLessThan(0.004)
      prev = out
    }
  })

  it('cs_beat steps forward on kicks and never goes back', () => {
    const S = fresh()
    run(S, quiet, 1)
    let prev = 0
    for (let i = 0; i < 40; i++) {
      const out = run(S, i % 2 ? { ...loud, bassZScore: 0 } : loud, 0.25)
      expect(out.cs_beat).toBeGreaterThanOrEqual(prev)
      prev = out.cs_beat
    }
    expect(prev).toBeGreaterThan(0.5)
  })
})
