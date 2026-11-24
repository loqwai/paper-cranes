# Editor-Filesystem Sync

In dev mode, the editor and the filesystem stay in sync bidirectionally: saves in the browser write to disk, and external file changes push back into the editor.

## Editor → Disk

Pressing **Ctrl+S** (or Cmd+S) in the editor sends the shader code to a `/__save-shader` POST endpoint provided by the `editor-sync` Vite plugin. The plugin writes the code to the corresponding `.frag` file on disk. A POST whose `Origin` is another site gets 403 (`vite-plugins/same-origin.js`, also on `/__snapshot-preset`, `/__capture` and `/__vj-signal`); scripts that send no `Origin` (curl, node) still pass.

## Disk → Editor

The Vite plugin watches for `.frag` file changes via Vite's built-in `server.watcher`. When a shader file changes on disk (e.g. from an external editor, `git checkout`, or a script), the plugin reads the new content and pushes it to the browser via Vite's HMR custom event (`shader-update`).

## Multiplayer Interaction

When multiplayer editing is active, HMR-driven file updates set the `isApplyingRemoteEdit` flag to prevent re-broadcasting through the [multiplayer editor](multiplayer-editor.md). Each peer receives file changes directly via Vite HMR.

## Key Files

- `vite-plugins/editor-sync-plugin.js` — Vite plugin with POST endpoint and file watcher
- `src/monaco.js` — HMR event listener that applies `shader-update` to the Monaco editor
