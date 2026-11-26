# List page

The live-performance list on a phone: fuzzy search, a setlist built with `+`, GO to play the set in
a same-origin perform overlay where NEXT is one tap, all from a bottom bar in the thumb zone.

## Sub-features

- `list-fill`: the list fills with shaders and has no horizontal scroll at 390 px.
- `list-search`: typing in the find bar filters rows and the status shows `N matches in all M`.
- `list-set`: `+` (`title="Add to set"`) queues a shader; the Set sheet lists it.
- `list-go`: `▶ Go — play set` opens the perform overlay, whose iframe renders the shader.
- `list-perform-bar`: Prev, Fav, Tag, Image, Roll, Open, Next and Close in the overlay.
- `list-storage`: odd `cranes-list-*` localStorage values (`null`, `{}`, `5`) do not break it.

## How to get to it (user POV)

- Open `/list.html` on a phone. Tap the find bar, type, tap `+` on a row, tap `Set`, tap GO.

## Driving it with Playwright

Preconditions:

- Any target: `$B launch`, or `--base https://visuals.beadfamous.com`, or a Pages preview.

- **Whole path.** Run `.agents/skills/verify-paper-cranes/bin/list-page.mjs` (add `--base <url>`,
  `--query <text>`, `--video`). At 390x844 it waits for `.shader-list a[href*="shader="]` rows,
  checks `scrollWidth <= 390`, fills `.find-input`, reads `.status-text`, clicks the first
  `button[title="Add to set"]`, clicks `.bar-btn` "Set", reads `.set-row .nm`, clicks
  `button.big-action` "Go", and waits for `.perform iframe` to draw more than 10 frames
  (2026-11-24 dev: 416 rows, `28 matches in all 415`, set row `plasma`, iframe drawing).
- **Storage resilience.** Covered by the smoke suite (`e2e/smoke.test.js`, branch
  `e2e/smoke-suite`); or `$B open list.html --viewport 390x844` after an init script that sets
  each `cranes-list-*` key to `null`, `{}` and `5`.
- **Video.** `--video` records `list.webm` headful.
- **Proof.** `~/paper-cranes-proof/<run>/list-page/`: `1-list.png`, `2-search.png`,
  `3-setlist.png`, `4-perform.png`, `summary.json`, `console.txt`.

## Gotchas

- Tapping a row body copies the URL and navigates away; use `+` and GO to stay on the list.
- WIP shaders are hidden by default (Sort sheet, "Include WIP").
- The perform iframe may carry remembered params (an `image=`) from the shader's presets.
- localStorage is per context: each Playwright context starts with no stars, set or recents.
