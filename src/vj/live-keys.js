// KEEP and PANIC from the keyboard on jam/show (docs/live-show-contract.md).
//   k             KEEP: the live show's keep (signal + snapshot); a plain snapshot when the page
//                 has no live show (not a ?remote=display page)
//   Escape twice  PANIC within 1 s: one stray Escape must never swap the wall
// Space and Backspace stay the pages' own snapshot keys.
// The page's snapshot path is registered as window.cranes.snapshot, which KEEP calls.

export const PANIC_WINDOW_MS = 1000

export const installLiveKeys = ({ snapshot, target = document, cranes = () => window.cranes, now = () => Date.now() }) => {
  const c = cranes()
  if (c) c.snapshot = snapshot
  let lastEscape = -Infinity
  const onKey = (event) => {
    if (event.target?.matches?.('input, textarea, select')) return
    if (event.code === 'KeyK' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault()
      const keep = cranes()?.keep
      Promise.resolve(keep ? keep() : snapshot()).catch((e) => console.warn('[live] KEEP failed', e))
      return
    }
    if (event.code === 'Escape') {
      const t = now()
      if (t - lastEscape <= PANIC_WINDOW_MS) {
        lastEscape = -Infinity
        cranes()?.panic?.()?.catch?.((e) => console.warn('[live] PANIC failed', e))
        return
      }
      lastEscape = t
    }
  }
  target.addEventListener('keydown', onKey)
  return () => target.removeEventListener('keydown', onKey)
}
