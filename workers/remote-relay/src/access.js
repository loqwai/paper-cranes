// Cloudflare Access, checked again inside the Worker. Access sits in front of /mcp (managed OAuth:
// docs/vj-mcp.md) and adds a signed `Cf-Access-Jwt-Assertion` to every request it lets through. The
// Worker verifies that JWT itself, so a missing or misconfigured Access application leaves /mcp
// closed rather than open: no token, a token for another application, or an expired one is a 401.
//
// RS256 over WebCrypto against the team's published certs; no dependencies.

const b64url = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4)), (c) => c.charCodeAt(0))
const json = (s) => JSON.parse(new TextDecoder().decode(b64url(s)))

const CERTS_TTL_MS = 10 * 60 * 1000
// An unknown kid may force a refetch, but not more often than this: otherwise every token with a
// made-up kid costs a request to the certs URL, a free amplifier for anyone who can reach /mcp.
const REFRESH_COOLDOWN_MS = 30 * 1000
// A shared fetch is trusted for this long. The request that started it can be canceled (its client
// disconnected), and then the fetch never settles: shared forever, it would hang every later caller.
const FETCH_TIMEOUT_MS = 5 * 1000
const certCache = new Map() // certs url -> { at, keys: Map(kid -> CryptoKey) }
const inflight = new Map() // certs url -> { at, p: Promise<Map> }, so concurrent misses share one fetch

const fetchKeys = async (url, fetchImpl, now) => {
  const res = await fetchImpl(url)
  if (!res.ok) throw new Error(`certs ${res.status}`)
  const { keys = [] } = await res.json()
  const map = new Map()
  for (const jwk of keys) {
    if (jwk.kty !== 'RSA' || !jwk.kid) continue
    map.set(jwk.kid, await crypto.subtle.importKey('jwk', { kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RS256', ext: true }, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']))
  }
  certCache.set(url, { at: now, keys: map })
  return map
}

const keysFor = (url, fetchImpl, now, refresh = false) => {
  const hit = certCache.get(url)
  if (hit && now - hit.at < (refresh ? REFRESH_COOLDOWN_MS : CERTS_TTL_MS)) return hit.keys
  const running = inflight.get(url)
  if (running && now - running.at < FETCH_TIMEOUT_MS) return within(running.p, FETCH_TIMEOUT_MS)
  const p = fetchKeys(url, fetchImpl, now).finally(() => { if (inflight.get(url)?.p === p) inflight.delete(url) })
  inflight.set(url, { at: now, p })
  return within(p, FETCH_TIMEOUT_MS)
}

// p, or a rejection after ms. The timer is the caller's own, so it fires even when p never settles.
const within = (p, ms) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('certs fetch timed out')), ms)
  p.then((v) => { clearTimeout(timer); resolve(v) }, (e) => { clearTimeout(timer); reject(e) })
})

export const accessConfig = (env) => {
  const team = String(env.ACCESS_TEAM_DOMAIN ?? '').replace(/^https:\/\//, '').replace(/\/+$/, '')
  const audiences = String(env.ACCESS_AUD ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  if (!team || !audiences.length || !/^[a-z0-9.-]+$/i.test(team)) return null
  return { issuer: `https://${team}`, audiences, certs: `https://${team}/cdn-cgi/access/certs` }
}

/**
 * The caller a valid Access JWT names, or null. { kind: 'user', email, sub } for a person,
 * { kind: 'service', id } for a service token. Never throws.
 */
export const verifyAccessJwt = async (token, config, { fetchImpl = fetch, now = Date.now() } = {}) => {
  try {
    if (!token || !config) return null
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [h, p, s] = parts
    const header = json(h)
    if (header.alg !== 'RS256' || !header.kid) return null
    let key = (await keysFor(config.certs, fetchImpl, now)).get(header.kid)
    // Access rotates its keys: an unknown kid earns one refetch.
    if (!key) key = (await keysFor(config.certs, fetchImpl, now, true)).get(header.kid)
    if (!key) return null
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64url(s), new TextEncoder().encode(`${h}.${p}`))
    if (!ok) return null
    const claims = json(p)
    const secs = now / 1000
    if (claims.iss !== config.issuer) return null
    const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud]
    if (!aud.some((a) => config.audiences.includes(a))) return null
    if (typeof claims.exp !== 'number' || claims.exp < secs - 30) return null
    if (typeof claims.nbf === 'number' && claims.nbf > secs + 30) return null
    if (claims.email && claims.sub) return { kind: 'user', email: claims.email, sub: claims.sub }
    if (claims.common_name) return { kind: 'service', id: claims.common_name }
    return null
  } catch {
    return null
  }
}

export const mcpError = (status, message, headers = {}) =>
    new Response(JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message }, id: null }), {
        status,
        headers: { 'content-type': 'application/json', ...headers },
    })

const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]'])

/**
 * Who is calling /mcp, or a Response refusing them. Access answers an
 * unauthenticated client itself (401 with the OAuth challenge); this is the
 * second lock, for a request that reaches the Worker any other way.
 * VJ_MCP_LOCAL=1 is only for `wrangler dev --var VJ_MCP_LOCAL:1`, and only on a
 * loopback hostname, where no Access exists to sign anyone in.
 */
export const authorize = async (request, env, { fetchImpl = fetch } = {}) => {
  const url = new URL(request.url)
  if (env.VJ_MCP_LOCAL === '1' && LOOPBACK.has(url.hostname)) return { who: { kind: 'local' } }
  const config = accessConfig(env)
  if (!config) return { refuse: mcpError(503, 'VJ MCP: Cloudflare Access is not configured for this Worker (ACCESS_TEAM_DOMAIN, ACCESS_AUD)') }
  const who = await verifyAccessJwt(request.headers.get('Cf-Access-Jwt-Assertion'), config, { fetchImpl })
  if (!who) return { refuse: mcpError(401, 'VJ MCP: sign in through Cloudflare Access (this URL is an OAuth-protected MCP server)') }
  return { who }
}

