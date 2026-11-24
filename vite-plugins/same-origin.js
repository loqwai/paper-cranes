// Did another web site send this request? The dev server's write endpoints (/__save-shader,
// /__snapshot-preset, /__capture, /__vj-signal) parse any body as JSON, and a cross-site
// `fetch(url, {method: 'POST', mode: 'no-cors', body})` is a simple request: the browser sends it
// with no preflight and CORS only hides the answer. So any page open in the browser could
// overwrite a shader (and HMR puts it straight on the wall). A browser always sends Origin on such
// a POST; a page this server served has an Origin host equal to the Host it asked (the tunnel too,
// where both are the tunnel hostname). Scripts and agents (curl, node) send no Origin and pass.
export const fromOtherSite = (req) => {
  const origin = req.headers.origin
  if (!origin) return false
  try {
    return ![req.headers.host, req.headers['x-forwarded-host']].includes(new URL(origin).host)
  } catch {
    return true
  }
}

// Does `url` reach a handler for `path`? Match the way connect mounts do: case-insensitive, and
// also any sub-path, so `/__VJ-SIGNAL`, `/__vj-signal/` and `/__vj-signal.x` are covered too.
// (An exact match let all three reach `use('/__vj-signal', ...)` with the check skipped.)
const reaches = (url, path) => {
  const u = String(url ?? '').toLowerCase()
  const p = path.toLowerCase()
  return u.startsWith(p) && (u.length === p.length || '/.?#'.includes(u[p.length]))
}

// Connect middleware: 403 for a write from another site on any of `paths`.
export const refuseOtherSites = (paths) => (req, res, next) => {
  if (req.method === 'GET' || !paths.some((path) => reaches(req.url, path)) || !fromOtherSite(req)) return next()
  res.statusCode = 403
  res.end(JSON.stringify({ error: `origin ${req.headers.origin} may not write to this dev server` }))
}
