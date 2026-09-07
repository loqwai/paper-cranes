# HANDOFF — live show rig

Written 2026-08-18, the night before the show. Branch: `live-show-rig`.

Everything below was verified against the real thing, not inferred from the code. Where something
is unverified it says so.

---

## Start here (the 60-second version)

```fish
# 1. dev server (branch-derived port; main = 6969)
npm run dev

# 2. display — on the laptop, and it MUST be localhost
#    http://localhost:6969/?shader=redaphid/chromadepth-lattice/6&remote=display&fullscreen=true&controller=lattice-nav&wavelet=true&room=<ROOM>&audio=tab

# 3. phone — loaded from production, so venue wifi does not matter
#    https://visuals.beadfamous.com/vj?room=<ROOM>&relay=relay.beadfamous.com
#    https://visuals.beadfamous.com/vjpad?room=<ROOM>&relay=relay.beadfamous.com
```

Last room used: `v3v3b2m15v`. **Pick a fresh one.** The room name is the ONLY access control —
anyone who joins your room drives your display. Treat it as a password, not a label.

Opening look: ZOOM 1.00 / COLOUR 0.62 / WARP 0.9.

---

## Why the URLs are shaped like that

**The display must be `localhost`.** A bare LAN IP is not a secure context, so the browser refuses
the microphone. `localhost` is the only origin that gets audio.

**The phone loads from production, not from the laptop.** Venue and hotel wifi usually has client
isolation on, so the phone cannot reach the laptop at all. Loading the controller from
`visuals.beadfamous.com` and meeting the display on a public relay sidesteps the LAN entirely.
Verified end to end: a fader dragged on the production page arrived as a live shader uniform on
the localhost display.

**`&relay=` is needed only because production is built from `main`,** which still has the old dead
default host. Merge `live-show-rig` → `main` and that parameter disappears. Everything else works
without the merge.

**Keep `&wavelet=true`.** This shader reads 18 wavelet uniforms and most of its spring features
come from them. Without it the music channels silently flatline — it looks dull, not broken.

**A cloudflared tunnel is NOT needed and was deliberately retired.** It works, but it publishes the
whole dev server including `POST /__save-shader`, which writes `.frag` files with no
authentication. Traversal is blocked so writes stay inside `shaders/`, but anyone with the URL
could overwrite the art mid-set. If you fall back to a tunnel, know that is the trade.

---

## Audio: use TAB audio

This was the biggest open question of the session and it is now settled.

| path | raw `energy` | `quietGate` | verdict |
|---|---|---|---|
| **tab** (`&audio=tab`) | 0.079, mean 0.098, peak 0.183 | **0.996, computed** | works |
| mic | only ever seen below the gate, in a quiet room | 0 | **unproven under volume** |

`quietGate` is computed from **raw** `energy` in `controllers/wavelet-ease.js:159` —
`(energy - 0.015) / 0.05`, fully open at 0.065 — **not** from a normalized feature. This is the
trap: normalized features can swing 0→0.9 and look reactive while the gate stays shut and the 16
gated uses in the shader stay dead. It reads as "a bit dull", never as "broken".

**Sharing tab audio needs a real human click** — `getDisplayMedia` requires genuine user
activation, so Claude cannot do it for you. Click **"Share tab audio"** on the overlay, pick the
music tab, and make sure the **"Share tab audio" checkbox is ticked** — sharing a tab without it
gives silent audio and everything downstream reads zero.

Tab audio does not survive closing or navigating the source tab. The overlay re-shows itself when
sharing stops, so you will see it happen.

---

## Gotchas that cost real time

- **A backgrounded tab freezes rendering.** Chrome throttles `requestAnimationFrame` to a stop, so
  `frameCount` stops climbing. Check `document.hidden` before diagnosing a "stalled renderer".
  Keep the display foreground / fullscreen.
- **TAKE OVER makes effects go deaf.** The phone's six music faders are `energySpring`,
  `waveletBass/Band2/Band5Spring`, `melodyFlow`, `spectralCrestSmooth`. Any effect driven *only* by
  those stops responding to music the moment you take over. Two of the three sparkle drivers and
  the entire palette-hue journey were in exactly this state during the rehearsal.
- **`quietGate` pinned to 1 through real silence** will let raw normalized features blow up into
  hue-spin and flashing from nothing. Fine while music plays; RELEASE that channel if you go quiet.
- **Screen goes black → tap another shader on the phone.** Previously verified recovery.
- **`/vibej` rewrites its target `.frag` every minute.** Point it at
  `shaders/redaphid/wip/lattice-vj/1.frag` — a byte-copy of `chromadepth-lattice/6` kept as the
  scratch copy — never at committed art.

---

## Infrastructure notes

**Relay:** `wss://relay.beadfamous.com/ws/<room>` — a Durable Object per room, using the
Hibernation API so it evicts from memory while idle without dropping sockets. Source in
`workers/remote-relay/`, deploy with `npx wrangler deploy` from that directory. Protocol matches
the dev-server WebSocket exactly: relay verbatim to every other client, never echo the sender,
drop non-JSON, broadcast `connectedClients` on join and leave.

**Do not use `paper-cranes-remote.loqwai.workers.dev` or anything on `*.hypnodroid.com`.** A
wildcard Cloudflare Access app guards both and 302s the WebSocket upgrade to a login page. This is
why `iceland.hypnodroid.com` could not be used despite being requested — it was created, inherited
the block, and was removed cleanly (no stray DNS record). `beadfamous.com` carries no Access app.
**No Zero Trust policy was modified.** If you want `iceland` to work, add a Bypass policy for that
hostname yourself — that is a deliberate hole in your security posture and your call to make.

**Message type is `update-params`**, not `params`. Anything sent as `params` reaches
`RemoteDisplay` and falls through to its default `postMessage` branch — it looks delivered and does
nothing. A `null` value RELEASES a param (deletes the key) rather than pinning it.

**Short links** `2cb.pw/02bn3` (vj) and `2cb.pw/o6zmx` (vjpad) are written into the `short-urls` KV
namespace but **2cb.pw itself is broken** — root 500s, valid keys 404. The namespace had no other
keys at all, so the Worker is probably bound elsewhere or unhealthy. Its source is not in this
repo. Use the full URLs.

---

**Track names:** the Spotify MCP server hangs — `SpotifyPlayback` was called once and returned
nothing for 1800s before aborting, so it likely needs re-auth. Do not wait on it. `/vibej` does not
need it: its documented path scrapes the now-playing widget from an `open.spotify.com` tab, and
failing that, the audio features alone are enough to pick moves (the rehearsal ran entirely that
way).

## Test harnesses

```fish
node scripts/test/relay-roundtrip.js relay.beadfamous.com   # relay: verbatim, no echo, room isolation
node scripts/test/tunnel-bridge.js https://<tunnel>         # only if you fall back to a tunnel
node scripts/validate-shader.js shaders/<path>.frag         # static lint
```

---

## Repo state

- `index.js` no longer reloads the display on every shader change — it hot-swaps
  `window.cranes.shader` when the changed file is the one on screen, and ignores everything else.
  Without this, every `/vibej` tick cost a black frame, an audio-context restart and the whole
  500-frame feature history, once a minute, usually for a file not even being shown.
- `shaders/redaphid/wip/lattice-vj/1.frag` carries two rehearsal edits (see
  `journals/lattice-vj-1-cool-moments.md` for the reasoning and the audio fingerprints).
- **Uncommitted and left alone deliberately:** `package-lock.json`, `shader-dates.json`, and the
  deleted `working-shaders.txt` — these are yours, from before this session.
- `.wrangler/` is untracked build cache from deploying the worker. Safe to delete; worth
  gitignoring if it becomes annoying.
- `npm install` was never run. The only pulled commit added HTML/CSS/JS and one `vite.config.js`
  line — no dependency changes.

## Still open

- `/vibej` rehearsal reached **iteration 2 of 10** before the browser disconnected. Nothing was
  left half-written; the shader is clean and lints clean.
- The three effects found deaf under TAKE OVER deserve a design pass: every effect wants at least
  one driver outside the phone's fader set. Safe-by-construction drivers:
  `waveletCentroidSpring`, `spectralRoughnessSmooth`, `wubDepth`, `sectionMode`/`sectionMix`,
  `evoPhase`.
- Signals the controller exports that this shader still ignores: `bassNoteFlow` (bassline pitch
  contour), `evoPhase` / `energyLong`, `sectionMix`.
