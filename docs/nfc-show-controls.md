# NFC show controls: smiley stickers on the arm

Aaron, 2026-11-24: "I'm planning on using nfc smiley face stickers stuck to my arm to navigate
through this in the dark". Each sticker is one show control (KEEP, PANIC, NEXT beat, TAKE a
proposal, a favourite look). He taps his phone to the sticker. The vjpad already open on the phone
reads the tag and sends one message to the wall. No model is in the path, and the server adds
nothing.

Storyboard: board [live-show-skills](https://draw.hypnodroid.com/b/live-show-skills), frame
`nfc-arm` ("11 · Smileys on the arm").

## How it works

```
sticker (URL record …/vjpad#nfc=s3)
  → Android Chrome, vjpad in front, NDEFReader.scan() armed
  → nfc-show-controls.json: s3 = NEXT
  → one message on the vjpad's room socket ({type, data, via:"nfc"})
  → relay room → display applies it (and flashes a corner dot with ?vj=1)
```

- **The page does the work.** `src/vj/nfc-controls.js` (pure: id parsing, the map, the messages,
  the haptics) and `src/vj/vjpad-nfc.js` (the chip, the scanner, the fallback tab).
- **Wire messages are the live-show contract's** ([live-show-contract.md](live-show-contract.md),
  PR #243): `vj-keep`, `vj-panic`, `proposal-answer`, and `update-params` for beats and favourites.
  A sticker is Aaron's own hand, so its messages carry no `source`: the HANDS lock never holds
  them. The envelope adds `via: "nfc"`, which only the display's flash reads.
- They take the same paths in the display as the vjpad's buttons (`src/remote/RemoteDisplay.js`,
  `src/vj/live.js`): `update-params` applies synchronously and then counts as his hands, so a beat
  or favourite drops any agent value held for the same key; `vj-panic` with no fork swaps to the
  display's own boot fork.

## Why this mechanism

Aaron's phone is Android: a motorola razr fold since 2026-11-23, a Razr Ultra 2025 before it
(vault `kb/facts/owned-gear-inventory.md`). The writer already relies on Web NFC, which exists only
in Chrome on Android (mindmeld 92773, 41519).

| option | verdict |
|---|---|
| (a) tag URL opens a page | Too slow as the main path (page load, 1.5 to 3 s) and it takes the screen from the vjpad. Kept only as the fallback below. |
| (b) Web NFC `NDEFReader.scan()` in the open vjpad | **Chosen for Android.** No navigation, one socket hop. Needs the vjpad in front with the screen on and unlocked. Android does not read NFC with the screen off. |
| (c) iOS Shortcuts automation that calls an HTTP action endpoint | iPhone only. Not built: his phone is Android. See "iPhone, later". |
| (d) tag URL that calls an action endpoint | Not needed. The fallback tab does the same job over the vjpad's own socket, with no endpoint and no token on the tag. |

### Latency

- **Measured** (`e2e/nfc-show-controls.test.js`, `E2E_NFC_LIVE=1`, from this desktop through
  `relay.beadfamous.com`, 2026-11-24): simulated tag read to `vj-keep` arriving at a room peer
  took 35, 42 and 44 ms. Through the local stand-in relay: 4 ms.
- **Estimated** for the phone: about 100 to 200 ms for Android to detect the tag and read one
  NDEF record, plus the phone's own network round trip (20 to 80 ms on venue wifi or LTE), plus
  the measured relay hop. That gives **about 150 to 300 ms from tap to wall**. The fallback tab
  adds a page load, about 1.5 to 3 s.
- Not yet measured on a real phone. See "Still to prove".

## The stickers

A tag holds only a URL with a short id: `https://visuals.beadfamous.com/vjpad#nfc=s1`. The id
means nothing until the phone's map says what it does, so re-assigning a sticker is an edit to
[`nfc-show-controls.json`](../nfc-show-controls.json) and a deploy. The tag is never rewritten.

| sticker | default action | buzz (ms) |
|---|---|---|
| s1 | KEEP: save this look | 60 |
| s2 | PANIC: the display's boot fork (`?panic=`, else the shader it booted with) | 120, 60, 120 |
| s3 | NEXT beat | 25, 50, 25 |
| s4 | TAKE the newest proposal card | 60, 40, 20 |
| s5 | FAV A: `clit-set/2` | 20, 30, 20, 30, 20 |
| s6 | FAV B: `clit-set/1` | 20, 30, 20, 30, 20 |
| s7 | PREV beat | 25, 50, 25, 50, 25 |
| s8 | DROP the newest proposal card | 15 |
| any other tag | nothing is sent | 400 |
| socket down | nothing is sent and nothing is queued | 400, 100, 400 |
| TAKE with no card, NEXT past the end | nothing is sent | 15, 80, 15 |

- **Map format.** `do`: `keep | panic | next | prev | take | drop | set`. `set` sends its object
  as `update-params` (a `shader`, knobs, or both). `fork` on a panic sticker names a fork; without
  it PANIC sends `{}`, exactly as the vjpad's PANIC button does.
- **Shows.** A show is a `setlists/<name>.json` (the `/show` skill's setlists) or an entry in
  `shows.<name>`, which can override `stickers` and give `beats`. The vjpad picks the show from
  `?nfc_show=<name>` (remembered on the phone), else `default` (`clit-set`).
- **Beats.** NEXT and PREV walk the setlist's `beats`, reading each beat's `shader` or `path` and
  `params`, as the board bridge does. A setlist with a `driver` (`sun-set`) gives them nothing to do:
  its beats need the laptop's driver script to rebake clock anchors, so use ▶ on the board there.
  The cursor is kept per phone (`localStorage['cranes-nfc-beat:<show>']`). It is separate from the
  board bridge's cursor, so mixing NEXT on the arm with ▶ on the board can skip or repeat a beat:
  use one or the other. One shared cursor: [#247](https://github.com/loqwai/paper-cranes/issues/247).
- **Double reads.** The same sticker read again within 1.5 s counts as one press, so a shaky
  NEXT never skips a beat.

## Use it at a show

1. Open the vjpad on the phone in Chrome with the room: `https://visuals.beadfamous.com/vjpad?room=<room>&nfc_show=clit-set`.
2. Tap **NFC** in the header once. Chrome asks for NFC permission the first time. The chip shows
   `NFC ●` when armed. The tap also lets the page vibrate. Chrome allows vibration only after the
   page has been touched.
3. Tap **AWAKE** so the screen stays on. NFC reads only with the screen on and unlocked.
4. Tap the phone to a sticker. You feel the buzz, the chip shows the action for about a second,
   and with `?vj=1` the display shows a coloured dot in its top-right corner (green KEEP, red
   PANIC, cyan proposal, violet beat or favourite).

After the first grant, a reload re-arms by itself.

### When the vjpad is not on screen

If another app is in front, Android opens the tag's URL in a new Chrome tab. That tab has no room,
so it goes to the room this phone's vjpad last used (`localStorage['cranes-nfc-home']`), removes
the `#nfc=` from its URL, and shows one full-screen button: **SEND PANIC** (or the sticker's
label) and a small **cancel**. Tap it and the sticker fires once. The button goes away after
20 s, and a reload never brings it back. This takes about 1.5 to 3 s plus the tap, and leaves a
second vjpad tab open. On a phone that has never opened a vjpad with a room, such as a
stranger's, the tab has no room, shows no button and sends nothing.

## Write the stickers

1. On the Android phone, open `https://visuals.beadfamous.com/nfc-writer.html#show`.
2. The queue is `s1 KEEP` to `s8 DROP`. Tap **Tap a tag to write**, then hold a blank sticker to
   the phone. The writer moves to the next one.
3. Mark each smiley as you go (a dot of nail polish, or position on the arm: KEEP nearest the
   wrist). The labels in the writer are a reminder of the default map, not what the tag carries.

## Threat model

- **A sticker leaks nothing.** It holds `vjpad#nfc=s1`: no room, no secret, no token. Anyone can
  read it. On their phone it opens a vjpad with no room.
- **The capability is the room**, which lives on Aaron's phone (in the vjpad URL and
  `cranes-nfc-home`). The room name is already the password for the whole control surface
  (`workers/remote-relay/src/index.js`), and NFC does not widen who holds it.
- **No new endpoint, so no new attack surface.** Every message goes through the vjpad's existing
  room socket. The display secret (PR #236) is unchanged, and stickers cannot register a display.
- **A link is a sticker to the fallback.** Any web page, QR code, chat message or giveaway tag
  that opens `visuals.beadfamous.com/vjpad#nfc=s2` on Aaron's phone looks exactly like a tag the
  phone read while the vjpad was not in front. So the fallback tab asks for one tap first, and a
  link alone does nothing.
  Blast radius if he does tap: one action from his own map, the same as a button on his vjpad
  (one visible shader swap, KEEP, or a proposal answered). Nothing reads state, and nothing
  escapes the room.
- **A forged sticker** (a stranger's tag with `#nfc=s2` that Aaron taps by mistake) can fire only
  an action on his own map, which he could fire by hand anyway. With the vjpad in front it fires
  at once, like any of his stickers; in the fallback it waits for the tap.
- **Giveaway stickers never drive his room.** They hold `/s/<random id>` links (board
  [event-stickers](https://draw.hypnodroid.com/b/event-stickers)), a path the vjpad never reads,
  and `idFromUrl` takes ids only from `#nfc=`/`?nfc=`. Keep the `/s/` resolver from ever
  redirecting to `/vjpad`.
- **The home room** is any vjpad URL with `room=` this phone opened last, so a link to
  `/vjpad?room=other` moves it. That can only send his own taps to the wrong room. It never stores
  a `display_secret`.

### iPhone, later

Web NFC does not exist on iOS. An iPhone needs a Shortcuts personal automation ("When NFC tag X is
scanned → Get contents of URL"), which needs an HTTP action endpoint on the relay Worker. The
design, if it is ever needed:

- `POST /act/<room>/<action>` with `Authorization: Bearer <action token>`, never in the URL. The
  token is per room and separate from the display secret. It is stored hashed in the room's
  Durable Object like `secret.js`, and rotated by an MCP tool. It never goes on a tag: the
  Shortcut holds it.
- It maps to the same wire messages as above, with no `source`, and returns `204` with no body.
  It never returns state, so a leaked token can fire actions but cannot read the show.
- Rate-limit it per room (for example 5 per second), and refuse `set` with a shader that is not
  in `shaders.json`.

## Still to prove on a real phone

- That an armed `NDEFReader.scan()` in the foreground stops Android from also opening the tag's
  URL. Chrome's Web NFC uses reader mode, which should do this. The e2e cannot show it.
- The tap-to-wall time on the razr fold, through venue wifi.
- How reliably a sticker on skin reads through a sleeve, and at what distance (NTAG21x stickers
  read at about 1 to 3 cm).
- That vibration patterns can be told apart in a loud room.
- The fallback tab: whether Android reuses the open vjpad tab or opens a new one, and whether the
  extra tap is bearable in the dark.

## Tests

- `src/vj/nfc-controls.test.js`: id parsing, the map, the wire messages, debounce, offline, and
  proposals.
- `e2e/nfc-show-controls.test.js`: a vjpad with a stubbed `NDEFReader` and a display in one room on
  a local relay (`E2E_NFC_RELAY_PORT`, default 7170; site on `E2E_PORT`, default 7168). A FAV tap
  switches the display's shader, KEEP reaches the room as `vj-keep` with `via: "nfc"`, a wrong tag
  sends nothing, the fallback tab finds the room and fires only after its tap, cancel and reload
  fire nothing, and a stranger's tab shows no button and sends nothing. Run it with `npm run build
  && npx vitest run --config vitest.e2e.config.js e2e/nfc-show-controls.test.js`. Add
  `E2E_NFC_LIVE=1` to go through `relay.beadfamous.com` and print the measured hop.
