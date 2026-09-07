# vjpad v2 — generic surface + the loop on the glass

Design doc, 2026-08-20, from the live lattice-vj/7 session. User brief: *"make it more generic,
and provide feedback from you re: processing etc so I don't have to tab back and forth."*

## a. Goals + non-goals

**Goals**
1. Any shader gets a playable pad with zero hand-written config; curated config only *improves* it.
2. Pads beyond x/y: button, toggle, radio, fader — declared in the same layered config.
3. The phone is the single pane of glass: the VJ loop's beats, LEARN lifecycle, health actions and
   shader swaps appear ON the pad, and the user can answer (veto/keep) without leaving it.

**Non-goals**
- No server beyond the dev server (static prod degrades silently, as today).
- No CRDT/multi-writer resolution beyond existing bank claiming — one phone per bank stays the law.
- Not a replacement for the chat: long-form reasoning stays in the session; the pad gets one-liners.

**Already built (don't redesign):** the three config layers live in `src/vj/vjpad-layout.js` —
checked-in `vjpad-layouts.json`, auto-banks from `shaders.json`'s `knobs` field (extracted from
`K141 …` / `@knob:` comments), sparse per-phone patches (EDIT screen → localStorage). Bank
claiming, RELEASE→null semantics, quietGate pinning, `knobBase` mirrors: all keep working as-is.

## b. Config schema

### b1. Pad types (backward compatible: no `type` ⇒ `"xy"`)

```jsonc
// in a bank's "pads" array — existing xy pads are untouched
{ "type": "button", "name": "LEARN", "hue": "#f43f5e",
  "key": "vjConfirm", "mode": "stamp" },          // stamp: sends epoch-seconds on tap (an EVENT;
                                                  // excluded from RELEASE/RESET — it is not a held param)
{ "type": "button", "name": "PUNCH", "key": "knob_170",
  "mode": "momentary" },                          // 1 while held, 0 on lift (both sent immediately)
{ "type": "toggle", "name": "FREEZE", "key": "knob_171",
  "on": 1, "off": 0, "def": 0 },
{ "type": "radio",  "name": "SCENE",  "key": "knob_172",
  "options": [ {"label":"A","value":0}, {"label":"B","value":0.5}, {"label":"C","value":1} ],
  "def": 0 },
{ "type": "fader",  "name": "GAIN", "orient": "v",
  "axis": { "key": "knob_160", "min": 0, "max": 1, "def": 0.5, "curve": "exp" } }
```

Rules:
- Every non-xy pad occupies one grid cell (same flow layout); `wide: true` opt-in as today.
- Mirror slots: xy uses 2 (x,y), all others use 1; `mirrorKnob()` gains a per-pad slot count.
- RELEASE nulls `key` for momentary/toggle/radio/fader exactly like axes; RESET applies `def`.
- One finger per pad, unchanged; toggle/radio fire on tap, not on slide-over.

### b2. Shader strip from shaders.json

`vjpad-layouts.json.shaders` becomes the **pin layer**, not the whole list:

```
strip = pins (in order, labels as written)
      + shaders.json favorites (`favorite: true`), newest `modified` first
      + this phone's 3 most recently *played from the pad* (localStorage)
      → dedupe by path, cap 12
```

Auto-labels for unpinned entries: `prettyName` squeezed to ≤4 chars (initials of words, digits
kept: "lattice vj 7" → `LV7`). Collision ⇒ append digit. Pins always win their label.

### b3. Knob metadata in shader source (feeds auto-banks)

Extend the explicit form only (the K-comment heuristic stays label-only):

```glsl
// @knob: 141 TWIST STEP def=0.5 min=0 max=1
```

`extractKnobs` parses trailing `k=v` pairs; when any knob carries metadata, `shaders.json.knobs`
switches from the compact string to `[{ "n":141, "label":"TWIST STEP", "def":0.5 }, …]`.
`parseKnobs` accepts both shapes. Auto-bank axes then use declared `def`/`min`/`max`; without a
declaration the default stays 0 (a wrong 0.5 on a non-centred knob is worse than the status quo —
see open question 3).

## c. Message protocol

### c1. Loop → pad: `vj-status` (over the existing /ws hub; broadcast-to-others)

```jsonc
{ "type": "vj-status", "data": {
    "kind": "beat" | "learn-progress" | "learn-result" | "health" | "swap" | "info",
    "text": "≤120 chars, glanceable — the strip line",
    "detail": "optional longer text, shown only in the expanded drawer",
    "severity": "ok" | "busy" | "warn" | "act",
    "id": "learn-1787247676",   // optional; same id REPLACES the prior entry (progress → result)
    "ts": 1787247800000
}}
```

- Sender: `node scripts/vj/remote-send.js '{"kind":"beat","text":"…","severity":"ok"}' vj-status`
  (remote-send already takes a type argument).
- `vj-learn-result` (shipped today) stays accepted as an alias; pad maps it to
  `{kind:"learn-result", severity:"ok"}` until the loop migrates.
- LEARN lifecycle uses replace-by-id: `learn-progress "analyzing 481 samples…"` (severity busy)
  → same id, `learn-result "wired ✓ K147 ← energyLong r=-.75"` (ok) or `"free play — nothing
  wired"` (info).
- Loop discipline: one `beat` message per beat summary (the same one-liner already written to
  chat), `health` only when the loop *acts* (not for every watchdog line).

### c2. Pad → loop: `vj-user-ack` (direct POST, not the hub)

The pad is served by the same dev server that hosts `/__vj-signal`, so the simplest reliable
path is **no hub hop at all**:

```js
fetch('/__vj-signal', { method: 'POST', headers: {'Content-Type':'application/json'},
  body: JSON.stringify({ type: 'vj-user-ack', ref: entry.id, verdict, t: new Date().toISOString() }) })
```

- `verdict: "veto" | "keep" | "noted"`. Lands in `.claude/vj-signals.jsonl`; the loop arms one
  more Monitor pattern (`"type":"vj-user-ack"`) — lines stay tiny, same rule as confirm-learn.
- `ref` matches a `vj-status` id, so `veto` on `learn-1787247676` tells the loop exactly which
  wired mapping to revert (loop policy: veto ⇒ revert the marker edit next beat, confirm on strip).
- Static host / endpoint missing: `.catch()` swallow + strip shows an `offline` chip (same
  degradation as runtime.js `post()`).

## d. UI sketch

```
┌──────────────────────────────────────────┐
│ ● VJ7 · EXPLORE A ◉ · 1 display          │  status line (unchanged)
│ [VJ7][VJ6][L6][L5][HZN][…]               │  strip (pins + favorites + recents)
├──────────────────────────────────────────┤
│ ┌────────────┐ ┌────────────┐            │
│ │  FOLD      │ │  CELL      │            │  pads (xy / button / toggle /
│ │  ·         │ │        ·   │            │   radio / fader mixed per config)
│ └────────────┘ └────────────┘            │
│ ┌────┐ ┌────┐ ┌──────────────┐           │
│ │LEARN││FRZ │ │ SCENE A B C  │           │
│ └────┘ └────┘ └──────────────┘           │
├──────────────────────────────────────────┤
│ ▸ ✓ wired K147 ← energyLong r-.75   ② │  LOOP STRIP: newest message, unread count
├──────────────────────────────────────────┤   tap ▸ = drawer:
│ [RELEASE]  [RESET]                       │  ┌───────────────────────────────────┐
└──────────────────────────────────────────┘  │ 17:44 ✓ wired K147…  [✗VETO][♥KEEP]│
                                              │ 17:41 ⏳ analyzing 364 samples…    │
   severity → left-edge colour:               │ 17:37 ▲ server restarted           │
   ok dim-green · busy amber pulse            │ 17:31 ● b4 spatial permutations    │
   warn orange · act red                      │   (last 20, newest top, tap=detail)│
   buzz: learn-result ••, act ———             └───────────────────────────────────┘
```

Dark-room rules: strip text ≥16px mono, one line, ellipsized; drawer auto-closes 8 s after
opening from a new-message tap; no message ever moves a pad (strip has fixed height, drawer
overlays, never reflows the grid mid-finger).

## e. Phased plan

**Phase 1 — ship mid-session, 1–2 beats: the loop strip.**
`vjpad.js`: replace the `#learnfeed` div + `vj-learn-result` handler with the strip + drawer +
`vj-status` handler (alias kept), severity colours, replace-by-id, buzz map. Loop side: emit
`vj-status` beat/learn-progress/learn-result via remote-send (skill habit, no code). ~80 lines
pad-side, zero display-side. *This alone ends the tabbing.*

**Phase 2 — the reverse channel, 1 beat:** `vj-user-ack` POST + [✗ VETO][♥ KEEP] on learn-result
entries; loop arms the Monitor pattern and adopts the veto⇒revert policy.

**Phase 3 — pad types:** `normalizePad` grows `type`; renderers for button/toggle/radio/fader;
mirror-slot change; LEARN moves from hardcoded footer button into config
(`{"type":"button","key":"vjConfirm","mode":"stamp"}`) — footer keeps RELEASE/RESET only.

**Phase 4 — strip sourcing + knob metadata:** strip ranking from shaders.json (b2); `@knob:`
`k=v` parsing + structured `knobs` field (b3); auto-banks honour declared defaults.

Each phase is independently shippable; nothing in 1–2 blocks on 3–4.

## f. Open questions (for redaphid)

1. **Strip vs. two-line panel:** is one ellipsized line + drawer enough mid-set, or do you want
   the last TWO messages always visible (costs ~24px of pad height)?
2. **Veto semantics:** should ✗ VETO auto-revert the wired edit immediately, or flag it for the
   loop to revert with judgment (e.g. keep if you've since ridden the mapped fader approvingly)?
3. **Auto-bank defaults:** leave undeclared knobs at def=0, or treat 0.5 as the universal centre
   (wrong for non-centred knobs like FILL, right for every EXPLORE-style fader)?
