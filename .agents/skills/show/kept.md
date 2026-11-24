# KEEP on the board

On each `keep` event: `screenshot {"width":480}` through the VJ MCP, place it in frame `kept` with
the draw `image` tool, label it in one line (time, shader, the knobs that differ from 0). If the
shader is a `-wip` or a partner candidate (`-p<N>`), copy its file now to
`.claude/keeps/<time>-<name>.frag`, since that file keeps changing. The page has already queued
the snapshot for `/keep process`.

A board tap is a Send that selects exactly one control; the bridge makes one VJ MCP call for it
(`source: "board"`: his hands, never held). A whole-view Send, a chat line or two controls fire
nothing. A tap reaches the wall in 0.3-1.5 s (measured 2026-11-24), so the board is for beats, KEEP, PANIC and presets; the
dials and the vjpad stay the instrument (~16 ms).
