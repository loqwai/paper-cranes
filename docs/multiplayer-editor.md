# Multiplayer Editor

Multiple people can edit the same shader simultaneously with live cursors and real-time sync.

## How It Works

Open `edit.html` in multiple browser tabs (or on different machines pointing at the same dev server). Each tab gets a randomly generated identity (e.g. "Cosmic Falcon") with a unique cursor color. Identities persist per tab via `sessionStorage`.

When you type, your edits are broadcast to all connected peers via WebSocket. Cursor positions and text selections are visible to everyone in real time.

## Architecture

```
Tab A (editor)
    ↓ mp-edit, mp-cursor
WebSocket server (Vite dev server, remote-ws-plugin)
    ↓ broadcast
Tab B (editor)
```

### Message Types

| Message | Direction | Purpose |
|---------|-----------|---------|
| `mp-hello` | → all | "I just joined, who's here?" |
| `mp-presence` | → all | Identity announcement (name, color) |
| `mp-sync-full` | → requester | Full buffer sync for new joiners |
| `mp-edit` | → all | Incremental text edits (range + text) |
| `mp-cursor` | → all | Cursor position + selection range |
| `mp-leave` | → all | Peer disconnected |

### Conflict Handling

Edits are applied as Monaco `applyEdits` operations with `forceMoveMarkers: true`. There is no OT or CRDT — edits are applied in arrival order. This works well for small groups but can produce conflicts under heavy simultaneous typing.

### HMR Interaction

When the Vite dev server pushes a file change via HMR (from [editor-filesystem sync](editor-filesystem-sync.md) or external edits), the `isApplyingRemoteEdit` flag prevents the HMR update from being re-broadcast through multiplayer. Each peer receives HMR updates directly from Vite.

## Peer UI

Connected peers appear as colored chips at the top of the editor. Each peer's cursor is rendered as a colored line with a name label.

## Key Files

- `src/multiplayer/MultiplayerEditor.js` — main multiplayer logic
- `src/multiplayer/identity.js` — random identity generation
- `src/multiplayer/multiplayer.css` — cursor and chip styles
- `src/remote/WebSocketClient.js` — WebSocket client wrapper
- `vite-plugins/remote-ws-plugin.js` — WebSocket server
