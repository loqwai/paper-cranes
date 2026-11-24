# Setlists

A setlist is `setlists/<name>.json`:

```json
{ "name", "about", "shader", "controllers": ["…"], "url": "wavelet=true", "panic"?, "driver"?, "cue"?,
  "beats": [{ "n", "name", "shader", "params"?, "cue"? }] }
```

Notes for playing one, beat by beat, live in `setlists/<name>/SETLIST.md` when it has them. Read
them before the first beat.

- **Launch** with the setlist's `shader`, one `&controller=` per entry of `controllers` (in
  order), and its `url` extras. Pass `--setlist <name>` to the bridge so ◀ and ▶ on the board
  play beats.
- **`list`, `next`, `prev`, `<n>`**: a beat is
  `PORT=$P node scripts/vj/mcp-call.js set_shader '{"shader":"<beat shader>","params":{…}}'`.
  A setlist with a `driver` plays a beat by running it instead (`node <driver> <n>`), because it
  needs more than a swap. The current beat is in `.claude/setlist-state.json`, shared with the
  bridge.
- **`auto`** (setlists with a `cue` script): a Monitor on `node <cue> <beat cue> --max <hold>`;
  on its line, play the next beat. A dial he holds at an extreme pauses auto.

## The sun set (`setlists/sun-set.json`)

The 2026-10-09/10 set: 13 beats from the pre-party tile sky to the OG sky return, under
`controller=black-sun&controller=sun-set`. Its driver `setlists/sun-set/swap.mjs` re-anchors each
fork's clocks so new layers fade in, and `controllers/sun-set.js` eases his own dial moves back in.
Read `setlists/sun-set/SETLIST.md` first. Its driver and cue still reach the page through
`show.js eval`; porting them to `write_shader` / `get_state` is open work.

## clit-set (`setlists/clit-set.json`)

A starter: four hot-swaps on the clit-set voyage. Rewrite its beats after a set from what
`/keep process` made.
