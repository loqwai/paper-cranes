// Unified hash-based URL parameter system.
//
// All app params live in the hash fragment (#key=value&key2=value2) so they
// stay client-side and never hit the server. On first load, any classic
// ?search params are migrated into the hash and the search string is stripped.

// --- Migration: ?search → #hash (runs once on import) ---
const migrateSearchToHash = () => {
  const search = window.location.search
  if (!search || search === '?') return

  const searchParams = new URLSearchParams(search)
  const hashParams = new URLSearchParams(window.location.hash.slice(1))

  // Merge search params into hash (existing hash params win on conflict)
  for (const [key, value] of searchParams) {
    if (!hashParams.has(key)) {
      hashParams.set(key, value)
    }
  }

  // Build new URL with no search, only hash
  const url = new URL(window.location.href)
  url.search = ''
  url.hash = hashParams.toString()
  window.history.replaceState({}, '', url.toString())
}

migrateSearchToHash()

// --- Public API ---

/** Get a URLSearchParams snapshot of the current hash params */
export const getHashParams = () =>
  new URLSearchParams(window.location.hash.slice(1))

/** Set a single hash param and update the URL */
export const setHashParam = (key, value) => {
  const params = getHashParams()
  if (value === null || value === undefined) {
    params.delete(key)
  } else {
    params.set(key, String(value))
  }
  window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}#${params.toString()}`)
}

/** Delete a single hash param and update the URL */
export const deleteHashParam = (key) => {
  const params = getHashParams()
  params.delete(key)
  window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}#${params.toString()}`)
}

/** Batch-update hash params from an object. null/undefined values delete the key. */
export const setHashParams = (updates) => {
  const params = getHashParams()
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === undefined) {
      params.delete(key)
    } else {
      params.set(key, String(value))
    }
  }
  window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}#${params.toString()}`)
}

/** Build a URL string with the given hash params (for links, clipboard, etc.) */
export const buildHashUrl = (pathname, hashParams) => {
  const base = new URL(pathname, window.location.origin)
  base.search = ''
  base.hash = hashParams instanceof URLSearchParams
    ? hashParams.toString()
    : new URLSearchParams(hashParams).toString()
  return base.toString()
}
