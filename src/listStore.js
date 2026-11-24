// ---------------------------------------------------------------------------
// The list page's local memory
//
// Everything the performer marks at a party (stars, tags, what got played,
// the knob/image tweaks) lives in localStorage, deliberately:
//   - At a party he is on the deployed static site from a phone. There is no
//     server to write to and no build step to run, so a file write is not an
//     option at the moment he wants to tag something.
//   - The phone IS the performance device, so per-device storage is the right
//     scope. Build-time `@tags` / `@favorite` in the .frag stay the permanent,
//     shareable, in-repo truth; these merge on top of them.
// ---------------------------------------------------------------------------
const STORE_PREFIX = 'cranes-list'

/** A stored value must have the fallback's shape: an array, a plain object, or the same primitive type. */
const sameShape = (value, fallback) => {
  if (Array.isArray(fallback)) return Array.isArray(value)
  if (typeof fallback === 'object') return typeof value === 'object' && value !== null && !Array.isArray(value)
  return typeof value === typeof fallback
}

/**
 * Read a stored value, or the fallback when it is missing, unreadable or the wrong shape.
 * Valid JSON of the wrong shape (`null`, `{}` where a list belongs) used to blank the whole page.
 */
export const readStore = (key, fallback) => {
  try {
    const raw = localStorage.getItem(`${STORE_PREFIX}-${key}`)
    if (raw === null) return fallback
    const value = JSON.parse(raw)
    return sameShape(value, fallback) ? value : fallback
  } catch {
    return fallback
  }
}

export const writeStore = (key, value) => {
  try {
    localStorage.setItem(`${STORE_PREFIX}-${key}`, JSON.stringify(value))
  } catch {
    // Private mode / quota — the page still works, it just forgets.
  }
}
