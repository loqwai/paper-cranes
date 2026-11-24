// The app's URL params: the query string plus `key=value` pairs after `#`.
// Nothing on the server or in the service worker reads a param by name, so every key may live in either place.

const hashParams = (url) => new URLSearchParams(url.hash.slice(1))

// One merged view. A key in the winning layer replaces all of that key's values from the other.
export const mergeUrlParams = (url) => {
  const query = new URLSearchParams(url.search)
  const hash = hashParams(url)
  const [base, winner] = [query, hash] // the hash wins: it is the later, more local edit. Swap to let the query win.
  const merged = new URLSearchParams(base)
  for (const key of new Set(winner.keys())) {
    merged.delete(key)
    for (const value of winner.getAll(key)) merged.append(key, value)
  }
  return merged
}

export const readUrlParams = () => mergeUrlParams(window.location)

// Writes each key where it already lives, so a user's query params never move into the hash.
// A new key joins the hash only when the hash already holds params. null or undefined deletes from both.
export const withUrlParams = (href, changes) => {
  const url = new URL(href)
  const hash = hashParams(url)
  const hashHoldsParams = [...hash.keys()].length > 0
  let hashChanged = false
  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === undefined) {
      url.searchParams.delete(key)
      if (hash.has(key)) {
        hash.delete(key)
        hashChanged = true
      }
    } else if (hash.has(key) || (hashHoldsParams && !url.searchParams.has(key))) {
      hash.set(key, value)
      hashChanged = true
    } else {
      url.searchParams.set(key, value)
    }
  }
  if (hashChanged) url.hash = hash.toString()
  return url
}

export const writeUrlParams = (changes) => {
  window.history.replaceState({}, '', withUrlParams(window.location.href, changes).toString())
}
