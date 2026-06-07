# moire-eye-6

Fork of `moire-eye-5` — adds a **monotonic spin** driven by the controller, replacing the old
twitchy `iTime*audio` rotation that could lurch forward and back.

## Origin
- Forked from `redaphid/wip/moire-3d/moire-eye-5` on 2026-06-07 during a `/vibej` run (user `/fork`).
- Lineage: `moire-eye-6 ← moire-eye-5 ← moire-eye-4 ← moire-eye-3 ← moire-eye-1 ← moire-3d-1 ← shadertoy lc3SWN` × `iris-7`.

## Why this fork — monotonic spin (user request)
> "We need a monotonic spin instead of twitching forward and back. Use the controller."

The old rotation drove the tendrils with `-iTime*(0.4 + energyNormalized*0.8)` — putting audio
in the rotation *rate of a phase derived from iTime*, so when energy fluctuated the effective
angle lurched forward and back (the classic audio-in-phase artefact).

**Fix — use the controller's accumulated phase.** `controllers/moire-eye.js` holds a forward-only
`spin` accumulator (`spin += (0.0005 + bass*0.0016) * spinK`, `spinK` from knob_47) exposed as the
`spin_phase` uniform. Audio sets the *rate* (bass), never the *value* → it can only ever increase,
so it cannot twitch backward.

### Implementation notes
- **Precision:** `spin_phase` grows unbounded (thousands of radians). Adding it to `ang` before a
  `*fibreN` (×130) multiply would blow past float32 precision and alias the fibres. Instead we build
  a rotation matrix `spinM = rot(spin_phase*0.5)` from bounded `cos/sin` and rotate the *coordinates*
  (`ec` for the anatomy, `p.xy` for the moiré tunnel) — the high-freq multiply then happens on the
  wrapped `atan` output, not the giant phase.
- The `*0.5` constant gentles the default rate; the controller's **knob_47** still sets the
  underlying spin speed (0 = frozen, 0.5 = default, 1 = 2×).
- The **catchlight** is computed from an unspun coordinate (`ecFixed`) — a reflection glint
  shouldn't orbit with the iris.

Requires `&controller=moire-eye`.

## Knobs
Same as eye-5, plus: **knob_47 = spin speed** (via the controller). Highlights: knob_11 REACT,
knob_8 TREND, knob_1 zoom, knob_7 fibre density, knob_14 pupil, knob_13 anti-flicker.

## Preset URL
```
?shader=redaphid/wip/moire-3d/moire-eye-6&controller=moire-eye&remote=display&fullscreen=true&knob_47=0.5&knob_11=0.8&knob_1=0.85&knob_14=0.5
```
