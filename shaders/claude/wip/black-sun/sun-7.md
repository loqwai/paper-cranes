# sun-7: the kid show

Forked 2026-10-19 (~18:15 HST) from `sun-1-wip`, live, during a set for a 6-year-old. The music came in through the
MacBook Pro microphone. Controller snapshot: `controllers/black-sun-sun-7.js`, frozen from `black-sun.js`.

## Preset

```
https://visuals.beadfamous.com/?shader=claude/wip/black-sun/sun-7&controller=black-sun-sun-7&wavelet=true&lattice_mix=0.6&knob_2=0.1469&knob_4=0.5365&knob_15=0.5016&knob_16=0.4244
```

`lattice_mix` was being eased 0 → 0.6 over 3 minutes from the page and read 0.27 at fork time. The preset uses
the full 0.6.

## Baked knobs

| Knob | Value | Controls |
|---|---|---|
| K2 | 0.1469 | HUE SPIN (right stick) |
| K4 | 0.5365 | ZOOM, which is also flight thrust / warp speed (A) |
| K15 | 0.5016 | SUN X: steering, and the world pan for the 6× map |
| K16 | 0.4244 | SUN Y: steering, and the world pan |
| K9 | 0 | REACT (base now 3.5×) |
| K13 | 0 | GLOW (shields, Y) |
| K20 | 0 | FIRE: each 0→1 edge blows up a sun (B) |

## What this session added (on top of sun-1-wip)

- **DARK-FLOOR-2/3**: the low-luminance sky gaps dim to 40%, and `PAINT_FLOOR` drops from 0.17 to 0.10. The meter's
  dark reading went from 0 to about 0.2.
- **SEAM-EMBER-1, NO-PINK-1**: the sun's veins are ember instead of magenta, and a final hue guard turns any
  saturated pink/magenta into ember red. This fixed the hot-pink giant.
- **GAS-RATE-BASS-1** (controller): sustained bass speeds the gas flow, rate only, never reversing.
- **UFO-1/2/3, PERF-UFO-1**: five saucers launch from the sun on the `bs_ufoPh` clock. Bass and kicks speed the
  fleet, kicks bounce the saucers and flash their lights, and each saucer flies to a random point on screen.
  Pixels far from a saucer skip it.
- **BOOM-1/2** (shader + controller): on a bass hit or an energy z-spike, at most once every 2.5 s, the next small
  cast sun vanishes in a white-hot flash with a spiky spark shell and grows back over about 6 s. **SHIP-FIRE-1**
  lets K20 fire one on demand.
- **MIC-KICK-1** (controller): the wavelet bass-hit threshold drops from 0.9 to 0.4. On the laptop mic it peaks
  around 0.55, so no kicks fired at all before this.
- **KID-REACT-1, PUNCH-1**: REACT base goes from 1.0 to 3.5, the light gate from 1.0 to 1.8, and the gas flashes
  on every kick.
- **FLY-1** (shader + controller): four star layers rush outward from the heading point, on the forward-only
  clock `bs_flyPh`. Thrust (K4) and bass set the speed, which stretches stars into streaks.
- **MAP-1**: K15/K16 pan the sky, deep space and lattice six times further, and the small suns live in a wrapped
  6×4 world, so you keep finding them as you fly.

## Gamepad

An 8BitDo Lite 2 (HID, not MIDI) drives the knobs through a loop installed into the page with `show.js eval`.
Nothing is on disk, so a reload loses it. Nintendo layout: A thrust, B fire torpedo, Y shields, X hyperspace
(K9 at 1 for 3 s), left stick steers, right stick changes hue, D-pad sets warmth, Minus is autopilot.

## Known

- The wall runs at ~30 fps at 4K. An A/B test showed the UFOs aren't the cause. The user said 30 fps is fine.
- `scripts/validate-shader.js` is broken on this machine (no `glslangValidator` binary). Validate in-browser with
  `__vjValidate`.
