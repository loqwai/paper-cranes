# Handoff: sun lamp (office lighting version of the sun show)

Written 2026-10-12. Ask from the user: "Give me a version of the sun 'story/shader' that I can use for lighting in my office. I want dials that control the sun size, or other things that would affect lighting. I'm using a projector."

## State when this was written

- Worktree `/Users/hypnodroid/Projects/paper-cranes-sun-lamp`, branch `sun-lamp` off `main` (`a7bcc610`). `node_modules` is a symlink to the main checkout's. Nothing pushed, no PR.
- A background implementer (Opus, medium effort) was dispatched with the spec below and had written nothing yet. It dies when the old session closes, so expect one of three states.
  1. Nothing on the branch. Start from the spec.
  2. Partial work. Run `git -C ../paper-cranes-sun-lamp log --oneline main..HEAD` and `git -C ../paper-cranes-sun-lamp status --short`, then finish from there.
  3. Done. Commits for the shader, controller, dials and doc are on `sun-lamp`. Verify them (see Verification) before trusting them.
- The implementer may have left a vite dev server on port 6987. Check with `lsof -iTCP:6987 -sTCP:LISTEN` and kill it if it is stale.

## Design (decided)

Fork `shaders/sun/17.frag` (the late-show "giant" look) to `shaders/sun/lamp/1.frag`. Reference stills are `docs/shots/sun/17-moment-0221.png` and `docs/shots/sun/15-fork-0206.png`.

- **No story, no audio.** Every `bs_*` uniform the lamp does not vary becomes a `#define` constant, so the compiler folds the dead show branches away. Every audio reference (`GATE`, `SLOW_GATE`, medians, wavelet terms, kick/snare/flare/drop envelopes) resolves to a constant. The frame looks the same with or without a mic. The resting values come from `controllers/sun-17.js`.
- **Clocks come from a tiny controller.** `controllers/sun-lamp.js` integrates the clocks the giant rendering reads, at a rate set by K7. A shader can't hold an accumulator, and multiplying a rate by `iTime` makes the scene jump when the dial moves. Keep the clocks bounded so a multi-day run doesn't lose precision. The controller takes no audio input and outputs only declared uniforms.
- **0 on every dial gives the full-brightness designed look.** A URL with no knobs must never black out the room. Show knob numbers keep their meaning so MIDI muscle memory carries over. New dials go on vacated numbers. Every knob is named with the `// K<n> NAME` comment so `/vjpad.html` labels it.

| Knob | Name | Effect |
|---|---|---|
| K1 | DIM | Master dimmer applied last. 0 is full, 1 is about 3%, on a perceptual curve. |
| K2 | HUE SPIN | Kept from the show. |
| K3 | FAN | Kept. Arm brightness and reach. |
| K4 | SUN SIZE | Was ZOOM. Giant radius, widened so at 1 the sun fills most of the wall. |
| K5 | COLOR TEMP | White balance. 0 is neutral, 1 is about 1900K candle. A blackbody-ish multiplier that preserves luminance. |
| K6 | REACH | Kept. Prominences. |
| K7 | SPEED | 0 is a slow, calm drift. 1 is about the show's pace. |
| K8 | SKY SWAP | Kept. |
| K9 | FILL | Ambient fill. Lifts the background in the scene's own hues, not grey. |
| K10 to K14 | PAINT, WARMTH, SPARKLE, GLOW, DARK | Kept. |
| K15, K16 | SUN X, SUN Y | Giant position. The full range must reach on-screen and centred. |
| K17 | WASH | Blends toward near-white light that keeps the sun's luminance structure. |

The show's end-of-frame OKLCH knee stays. DIM, COLOR TEMP and WASH run after it and must never produce NaN or negative values.

Metadata: `#version` stays on line 1 if present. Add `@fullscreen: true`, `@mobile: false`, `@tags: sun, lamp, ambient, claude`, and a `// preset:` line of `https://visuals.beadfamous.com/?shader=sun/lamp/1&controller=sun-lamp&noaudio=true`.

The doc is `shaders/sun/lamp/lamp.md`. It holds the knob table, the launch URL, how to drive the dials (MIDI auto-map, `/vjpad.html` or `edit.html?remote=control` with the dev server, or `?knob_N=`), and what was cut from the show and why.

## Downsides already raised with the user

- **GPU load.** It is still the heavy show shader running all day. Turning the dead code into constants should make it cheaper. Measure the frame time against `sun/17`.
- **No music reaction.** The user can ask for a reaction dial later. It is not in scope now.
- **No exposure boost.** The white-out knee stays. Extra light comes from WASH, FILL and SUN SIZE.

## Verification (not done yet)

- `node scripts/validate-shader.js shaders/sun/lamp/1.frag`
- Run the dev server in the worktree with `PORT=6987 npx vite`. Render with headless Playwright at 1920x1080: `http://localhost:6987/?shader=sun/lamp/1&controller=sun-lamp&noaudio=true&fullscreen=true`.
- Take one screenshot per case: all dials at 0, K4=1, K15/K16 centred, K5=1, K17=1, K9=1, K1=0.8. Look at each one. Does it still read as the sun show? Does each dial visibly do what its name says? Are there NaN, black or white-out regions?
- Prove SPEED does not jump. Diff two frames about 100 ms apart across `window.cranes.manualFeatures.knob_7 = 1`.
- The console must show no shader or controller errors.

## After that

Commit in small units on `sun-lamp`. Messages explain why, use no prefixes, and go through `git commit -F -` with a quoted heredoc. Push every commit right away. Then open a PR whose body includes the branch preview link `https://sun-lamp.paper-cranes-visuals.pages.dev/?shader=sun/lamp/1&controller=sun-lamp&noaudio=true`. Run `/pr-review` until it comes back clean. Never rebase and never force push. Ask the user whether to run `/changelog`.
