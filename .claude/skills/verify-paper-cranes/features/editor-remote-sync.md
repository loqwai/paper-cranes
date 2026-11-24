# Editor save and remote display sync

In the editor, Ctrl+S or the Save button pushes the code to every connected `?remote=display` page
in real time and, on the dev server, writes the `.frag` to disk.

## Sub-features

- `edit-load`: `edit.html?shader=<path>` loads the source into the Monaco model.
- `edit-save-display`: saving with `remote=control` changes what a display draws.
- `edit-save-disk`: on the dev server, saving a named shader writes `shaders/<path>.frag`
  (`/__save-shader`).
- `edit-disk-to-editor`: an external `.frag` change reaches the editor and displays through HMR.

## How to get to it (user POV)

- Open a display: `/?shader=<path>&remote=display`.
- Open the editor: `/edit.html?shader=<path>&remote=control`, edit, press Ctrl+S or Save.

## Driving it with Playwright

Preconditions:

- A dev instance from `$B launch` (preview and deployed sites have no `/ws` and no disk writes).
- No other display on this instance you care about: a save reaches every display on it.

- **Whole path.** Run `.claude/skills/verify-paper-cranes/bin/editor-sync.mjs` (`--video` for
  headful video of both pages). It writes a solid-blue scratch shader
  `claude/wip/verify-scratch/1`, opens the display and checks it draws blue (mean RGB
  `[0,0,255]`), opens the editor with `remote=control`, sets the Monaco model to solid red, clicks
  `#save`, waits until the display's `window.cranes.shader` is the red code, and checks the
  display draws red and the file on disk is the red code.
- **Proof.** `~/paper-cranes-proof/<run>/editor-sync/`: `display-before.png`,
  `editor-after-save.png`, `display-after.png`, `summary.json`, console logs.

## Gotchas

- On the dev server the display gets the new code twice: over `/ws` from the editor, and through
  HMR once the file write lands. This recipe proves "save reaches the display", not which path
  carried it. To isolate the socket path, use a room (`&room=<random>` on both pages) and check
  the display's `window.cranes.messageParams.shaderCode`.
- Never point the recipe at a real shader: save overwrites the file. Use the scratch path;
  `$B cleanup` deletes it.
- The editor needs `?shader=` to save to disk; a build strips it and saves nothing.
