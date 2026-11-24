# Phone wall: one phone, two screens

Plug the phone into a projector and it does both jobs: the visuals go to the projector (the
**wall**), and the phone's own screen stays the [vjpad](vjpad.md) (the **pad**). The two talk over
a **local link** inside the phone's browser, with no network, no relay and no laptop.

Aaron, 2026-11-24: "I'm getting a motorola fold 2026 and using that + a usb-c -> hdmi cable to
project from my phone. When that's the case, I want the phone screen to automatically be the vj
pad." Storyboard: board [live-show-skills](https://draw.hypnodroid.com/b/live-show-skills), frame
`phone-wall`.

## Show checklist

1. **The day before, on the phone:** open `https://visuals.beadfamous.com/` once and allow the
   microphone, so the wall never asks on the projector. Add the vjpad to the home screen.
2. **Cable:** a USB-C cable rated for video (DisplayPort Alt Mode, 10 Gbps or better). A
   charge-only cable shows nothing. The projector's USB-C input must take DP Alt Mode (the Aurzen
   ZIP Pro's upper USB-C port does). Whether the Motorola razr fold outputs DP Alt Mode is not yet
   confirmed (see below): try the cable at home first. Wireless casting
   measured around 260 ms of lag; wired is the point.
3. **Plug in.** If the phone asks, choose the mode that gives the big screen its own desktop
   (Motorola Smart Connect "desktop" / Android desktop mode), not mirroring. Mirroring shows the
   pad on the wall and cannot be split.
4. **Open the vjpad on the phone** (with `?room=` if agents should see the wall). If the phone
   reports the second screen to Chrome, a purple **PROJECT** button appears: tap it once. The
   wall opens on the projector and the pad says **WALL ✓**.
   If no PROJECT appears, open the wall yourself on the projector's desktop: Chrome, then the
   wall link (`/?remote=display&wall=1`, plus `&room=...` to match the pad). The pad links to it
   by itself within a second, with no tap on the phone.
5. **On the wall, one click or tap** (mouse, or the phone as trackpad) goes fullscreen and starts
   the audio. Both pages hold the screen awake: the pad's PROJECT tap turns on its AWAKE lock, and
   the wall asks for one when it boots.

If the cable comes out mid-set, the pad shows **NO WALL** in red and keeps working. Plug it back:
the wall links again (WALL ✓) and gets the pad's shader and every value the pad holds, except the
knobs RELEASE handed back to the music (until he moves them again). **✕** on the
banner stops waiting.

## How it works

| Piece | File | Does |
|---|---|---|
| the link | `src/phone-wall/link.js` | carries room-style `{type, data}` messages between the pad and the wall over a `BroadcastChannel` (two windows of one browser) and over `PresentationConnection`s. A hello each second; a wall unheard for 3.5 s, or one that said bye, is gone. |
| the pad | `src/phone-wall/pad.js` | `createPadClient`: the room socket plus the link, WebSocketClient-shaped. `mountPhoneWall`: PROJECT, WALL ✓, NO WALL. |
| PROJECT | `src/phone-wall/project.js` | finds a second screen and opens the wall on it |
| the wall | `src/phone-wall/wall.js` | `createWallClient` for `RemoteDisplay`: the link plus, where there is a broker, the room socket |
| the state | `src/phone-wall/state.js` | none, available, connecting, presenting, lost; pure, tested in `state.test.js` |

**PROJECT** tries, in order:

1. **The Presentation API**, when Chrome reports a presentation display for the wall URL. The wall
   runs as a presentation receiver; the PresentationConnection is the link. A presentation he
   started earlier in this tab is reconnected without a tap when its display comes back.
2. **A window**, `window.open` named `cranes-wall`, placed on the other screen when the Window
   Management API (`getScreenDetails`) can name it. The link is the BroadcastChannel.

The button shows only while a second screen is seen (`screen.isExtended`, or presentation
availability). With neither, nothing on the pad changes.

**Routing.** While a wall is linked, the pad sends `update-params`, `vj-keep`, `vj-panic`,
`proposal-answer` and `pad-hello` to it over the link first, then to the room as well while the
room socket is up, so a second display in the room still gets every move. Each such message
carries a `pwid` (the pad's link id and a count); the wall, which hears the room too, acts on the
first copy and drops the other (`createOnce` in `link.js`). Bank claims (`vjpad-peer`) stay on the
room. The wall sends the pad only what a pad uses
(`proposal`, `proposal-clear`, `vj-status`, `vj-learn-result`), over the link and the room both,
tagged the same way, so a pad in a room shows each loop line once; the inspector's canvas shots
stay on the room socket.
With no wall linked, the pad uses the room exactly as before.

**The room is the mirror.** With `?room=` on the pad, the wall joins the same room as a display,
so agents, the VJ MCP (`screenshot`, `get_state`, `propose`, `panic`) and the draw board bridge
reach it as any remote display. The pad's display secret, when its link carries one, rides along
in the wall's hash. On a static host with no room neither the pad nor the wall opens a socket at
all (`?room=` or the dev server's `/ws` is what opens one): a phone wall never lights the
"Reconnecting" badge on the projector, and a roomless pad does not retry `/ws` on a host that has
none, which logged a console error every few seconds and cost battery for the whole show. A
roomless pad with no wall says NO SERVER.

**The live show is unchanged.** The wall is a `?remote=display` page and every link message goes
through the same `RemoteDisplay` handler as a room message: HANDS, KEEP, PANIC, proposals and NFC
stickers (including the roomless fallback tab, which now fires over a linked wall) behave as in
[live-show-contract.md](live-show-contract.md) and [nfc-show-controls.md](nfc-show-controls.md).

**A fresh wall gets the pad's state.** The wall's hello carries a boot id and `fresh`, true until
a pad has moved it. On a fresh wall the pad has not fed, it sends one `update-params` with every
value it holds, plus its shader when the wall was opened without one. Keys RELEASE sent as null
stay out of it until a move sends them again, so a replug never pins a released knob. Like any of his moves, that
turns the HANDS lock on. A wall a pad already moved is left alone: a second pad page linking mid-set
(the NFC fallback tab, a reloaded pad, a tab Android discarded and restored) must not reset every
knob on the wall to that page's defaults.

**Trust.** Any page of the same origin in this browser can post to the link, so the wall takes from
it only what a pad sends (`update-params`, `vj-keep`, `vj-panic`, `proposal-answer`, `pad-hello`;
`FROM_PAD` in `wall.js`). The broker's own frames (`inspect`, `display-welcome`, `display-refused`,
`display-rekey`, `vj-agent-shader`) reach the wall only from the room socket. What does cross gets
the same checks as a room message: pinned keys are stripped, a PANIC fork must be a shader path,
and a write marked `source: 'agent'` is held during HANDS. The link has no pairing: a script on the
site in another tab of the phone (a `?controller=` URL is imported as JavaScript) can drive the
wall, as it could already drive any room it finds in this origin's storage.

## Pad URL params

| param | effect |
|---|---|
| `wall_url=<same-origin path>` | open this page as the wall instead of `/` (e.g. `/show.html?shader=sun/4`); a foreign origin is ignored |
| `room`, `relay`, `controller`, `image`, `audio`, `audio_file`, `audio_device`, `audio_time`, `fft_size`, `smoothing`, `history_size`, `panic`, `vj`, `noaudio`, `hands_ms`, `release_ms`, `wavelet` | passed on to the wall |

The wall page itself: `?remote=display&wall=1`. `wall` is pinned (relay.js): a room peer cannot set
it.

## Audio

The wall owns the audio, as any display does: the mic, or `audio_file=` (pass it on the pad's
link). Who can capture what:

- **Wall as a second Chrome window** (the BroadcastChannel path): an ordinary page of the same
  origin, so the mic permission granted in step 1 applies. Chrome starts its AudioContext suspended
  until the wall itself is tapped or clicked once (step 5); a tap on the pad does not count.
- **Wall as a presentation receiver:** unverified. On desktop Chrome a receiver runs in its own
  profile and cannot show a permission prompt, so expect no mic there; use `audio_file=`, or
  `audio=remote` fed by another device running `audio_send=true`.

## Performance and heat

- The wall renders at the projector's resolution, and the visualizer already steps its resolution
  down below about 40 fps and back up when it can (`src/Visualizer.js`).
- The pad's link costs one tiny message a second each way, and the wall bar repaints only on a
  state change. Measured in the e2e (headless desktop Chromium): pad to wall in a median of 6 ms,
  16 ms worst, including the pad's one-send-per-frame coalescing.
- A phone running a heavy shader at 1080p will get hot. Prefer `@mobile: true` shaders, keep the
  phone off a hot surface, and watch for throttling.

## Fold and unfold

The pad is one page; folding or unfolding resizes it without a reload (Chrome on Android handles
the configuration change itself), so pads, bank and link survive. The inner screen fits five
fingers best. Unverified on the Fold 2026 itself.

## What is certain and what is not (2026-11-24)

Certain:

- The Aurzen ZIP Pro takes video on its upper USB-C port over DP Alt Mode (reviews,
  e.g. [Notebookcheck](https://www.notebookcheck.net/Aurzen-Zip-Pro-tri-fold-1080p-projector-Superb-pocketable-design.1426250.0.html)).
- Chrome on Android's Presentation API was built for Cast devices; Chrome's "present to a
  secondary attached display" shipped for ChromeOS, Linux and Windows (Chrome 66), with no Android
  mention ([Chrome blog](https://developer.chrome.com/blog/present-web-pages-to-secondary-attached-displays)).
- Android 16 QPR3 makes connected displays generally available: a desktop session starts on the
  external display while the phone keeps its own state
  ([Android Developers blog](https://android-developers.googleblog.com/2026/03/android-devices-extend-seamlessly-to.html)).
  The post names Pixel 8, 9 and 10 and Samsung devices; it does not name Motorola, and it says
  nothing about Chrome or browser windows.
- Two same-origin windows of one browser share a BroadcastChannel; the e2e proves the whole live
  show over it with the network unreachable.

Unverified until tried on the phone:

- Whether the Motorola razr fold outputs video over USB-C at all (DP Alt Mode). Secondary CES 2026
  write-ups say so; no Motorola spec sheet or hands-on test seen (checked 2026-11-24). Earlier
  notes (mindmeld session 101206) treated it as certain.
- Whether Motorola ships Android 16 QPR3 connected displays on it, or only its own Smart Connect.

- Whether Chrome on the Fold reports the projector (`screen.isExtended`, `getScreenDetails`, or
  presentation availability). If none does, PROJECT never shows and step 4's second route applies.
- Whether Motorola Smart Connect's desktop mode runs Chrome on the projector as a second window of
  the same browser (needed for the BroadcastChannel), and whether a `window.open` from the pad lands
  there or covers the pad.
- What happens to a wall window on the projector when the cable is pulled (Android may move it onto
  the phone, over the pad; switch back with the recents gesture).
- Mic and autoplay in a presentation receiver on Android.

## Tests

- `src/phone-wall/state.test.js`, `src/phone-wall/link.test.js`: the state machine, the link over
  a fake BroadcastChannel and fake PresentationConnections, the pad's routing, the wall client, the
  wall URL.
- `e2e/phone-wall.test.js`: Playwright, two windows of one browser, the relay on a dead port. PROJECT,
  a knob, the hop time, HANDS, PANIC, KEEP, a proposal card, an NFC sticker, the roomless NFC
  fallback tab, unplug and replug; then the Presentation API path through a stand-in
  PresentationConnection. `npx vitest run --config vitest.e2e.config.js e2e/phone-wall.test.js`
  (uses ports 7180 and 7182).
