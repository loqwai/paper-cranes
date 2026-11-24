// Board mirrors (docs/board-mirror.md): read-only viewers of a room.
//
// A mirror is a page (mirror.html) that renders the same shader as the wall from the numbers the
// wall drew its last frame with. It joins at /view/<view id>, where the view id is the room's
// Durable Object id: a one-way, keyed hash of the room name. So a mirror link can sit on a board
// that many people read without handing out the room name, which is the password that lets a
// socket steer the wall.
//
// A viewer socket:
//   - never sends anything that counts: every frame it sends is dropped;
//   - never registers as a display, so list_displays and the display secret never see it;
//   - hears only `status` and the mirror feed, never the room's knob or audio traffic.
// The feed (`mirror-state`, `mirror-frame`) is taken only from a registered display (one whose
// hello the room accepted, so in a locked room one that proved the secret) and goes only to viewers.

export const MIRROR_TYPES = new Set(['mirror-state', 'mirror-frame'])

// A Durable Object id as `toString()` writes it.
export const VIEW_ID = /^[0-9a-f]{64}$/

// The biggest feed frame passed on: a state carries the shader source (tens of KiB at most).
export const MAX_MIRROR_CHARS = 256 * 1024

const readAtt = (ws) => { try { return ws.deserializeAttachment() ?? {} } catch { return {} } }

export const isViewer = (ws) => readAtt(ws).viewer === true

/** How many sockets in the room are displays-or-controllers, and how many are mirrors. */
export const roomCounts = (ctx) => {
  const sockets = ctx.getWebSockets()
  const viewers = sockets.filter(isViewer).length
  return { connectedClients: sockets.length - viewers, viewers }
}

/** A feed frame from `ws`: passed to every viewer only when `ws` is a registered display. */
export const routeMirror = ({ ctx, ws, message }) => {
  if (!readAtt(ws).display || message.length > MAX_MIRROR_CHARS) return 'drop'
  for (const peer of ctx.getWebSockets()) {
    if (peer === ws || !isViewer(peer)) continue
    try {
      peer.send(message)
    } catch {
      // Ignore; the close handler reaps it.
    }
  }
  return 'mirror'
}
