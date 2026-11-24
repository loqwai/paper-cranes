# KEEP on the board

Nothing for a model to do. With `--kept-link` (controls.md), the bridge answers every `keep` (pad,
MIDI, spacebar, board): a card in frame `kept` (time, shader, the knobs that differ from 0), the
picture in `.claude/vj-shots/keep-<time>.jpg`, and a `-wip` or `-p<N>` shader copied to
`.claude/keeps/` (those files keep changing). The page has already queued the snapshot for
`/keep process`. The picture is not on the board yet: draw cannot take an upload from a script
(feedback 0cb3f01d). When the link expires (1 h) the bridge logs `card refused`: mint a new one
and restart it.

A board tap is a Send that selects exactly one control; the bridge makes one VJ MCP call for it
(`source: "board"`: his hands, never held). A whole-view Send, a chat line or two controls fire
nothing. A tap reaches the wall in 0.3-1.5 s (measured 2026-11-24), so the board is for beats, KEEP, PANIC and presets; the
dials and the vjpad stay the instrument (~16 ms).
