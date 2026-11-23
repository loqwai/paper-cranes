// FNV-1a over a string, as 8 hex chars. Shared by the page and the dev server so the VJ MCP can
// tell whether a display is running the exact source that was just written to disk.
export const hashSource = (s = '') => {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}
