// The Worker's own check of the Access JWT, and who /mcp lets through.
import { describe, it, expect, beforeAll } from 'vitest'
import { verifyAccessJwt, accessConfig, authorize } from './access.js'

const TEAM = 'team.cloudflareaccess.com'
const AUD = 'aud-of-the-vj-mcp-app'
const env = { ACCESS_TEAM_DOMAIN: TEAM, ACCESS_AUD: AUD }
const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')

let keys, other, fetchImpl
const sign = async (claims, { key = keys.privateKey, kid = 'k1' } = {}) => {
  const head = enc({ alg: 'RS256', kid, typ: 'JWT' })
  const body = enc(claims)
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${head}.${body}`))
  return `${head}.${body}.${Buffer.from(sig).toString('base64url')}`
}
const now = () => Math.floor(Date.now() / 1000)
const good = () => ({ iss: `https://${TEAM}`, aud: [AUD], email: 'iam@example.com', sub: 'sub-1', exp: now() + 600, iat: now() })

beforeAll(async () => {
  const gen = () => crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify'])
  keys = await gen()
  other = await gen()
  const jwk = { ...(await crypto.subtle.exportKey('jwk', keys.publicKey)), kid: 'k1' }
  fetchImpl = async (url) => {
    if (url !== `https://${TEAM}/cdn-cgi/access/certs`) throw new Error(`unexpected fetch ${url}`)
    return new Response(JSON.stringify({ keys: [jwk] }))
  }
})

const verify = (token) => verifyAccessJwt(token, accessConfig(env), { fetchImpl })

describe('Access JWT check', () => {
  it('accepts a token Access signed for this application', async () => {
    expect(await verify(await sign(good()))).toEqual({ kind: 'user', email: 'iam@example.com', sub: 'sub-1' })
  })
  it('names a service token by its common name', async () => {
    const { email, sub, ...rest } = good()
    expect(await verify(await sign({ ...rest, common_name: 'svc.access' }))).toEqual({ kind: 'service', id: 'svc.access' })
  })
  it('refuses a token for another Access application', async () => {
    expect(await verify(await sign({ ...good(), aud: ['some-other-app'] }))).toBeNull()
  })
  it('refuses another issuer, an expired token, a future one, a forged signature and garbage', async () => {
    expect(await verify(await sign({ ...good(), iss: 'https://evil.cloudflareaccess.com' }))).toBeNull()
    expect(await verify(await sign({ ...good(), exp: now() - 120 }))).toBeNull()
    expect(await verify(await sign({ ...good(), nbf: now() + 600 }))).toBeNull()
    expect(await verify(await sign(good(), { key: other.privateKey }))).toBeNull()
    expect(await verify(await sign(good(), { kid: 'unknown' }))).toBeNull()
    expect(await verify('a.b.c')).toBeNull()
    expect(await verify(undefined)).toBeNull()
  })
})

describe('who /mcp lets through', () => {
  const req = (url, headers = {}) => new Request(url, { method: 'POST', headers })
  it('401s a request with no Access JWT', async () => {
    const { refuse } = await authorize(req('https://relay.beadfamous.com/mcp/r'), env, { fetchImpl })
    expect(refuse.status).toBe(401)
  })
  it('lets a valid Access JWT through as that person', async () => {
    const token = await sign(good())
    const { who } = await authorize(req('https://relay.beadfamous.com/mcp/r', { 'Cf-Access-Jwt-Assertion': token }), env, { fetchImpl })
    expect(who).toMatchObject({ kind: 'user', email: 'iam@example.com' })
  })
  it('stays closed (503) when Access is not configured, rather than open', async () => {
    const { refuse } = await authorize(req('https://relay.beadfamous.com/mcp/r'), {}, { fetchImpl })
    expect(refuse.status).toBe(503)
  })
  it('skips Access only for wrangler dev: VJ_MCP_LOCAL=1 AND a loopback hostname', async () => {
    expect((await authorize(req('http://127.0.0.1:8787/mcp/r'), { ...env, VJ_MCP_LOCAL: '1' }, { fetchImpl })).who).toEqual({ kind: 'local' })
    expect((await authorize(req('https://relay.beadfamous.com/mcp/r'), { ...env, VJ_MCP_LOCAL: '1' }, { fetchImpl })).refuse.status).toBe(401)
    expect((await authorize(req('http://127.0.0.1:8787/mcp/r'), env, { fetchImpl })).refuse.status).toBe(401)
  })
})

describe('the certs URL is not an amplifier', () => {
  // Each test uses its own team domain, so the module's cert cache starts empty for it.
  const certsServer = (team, kid = () => 'k1') => {
    const calls = { n: 0 }
    const impl = async (url) => {
      if (url !== `https://${team}/cdn-cgi/access/certs`) throw new Error(`unexpected fetch ${url}`)
      calls.n++
      const jwk = { ...(await crypto.subtle.exportKey('jwk', keys.publicKey)), kid: kid() }
      return new Response(JSON.stringify({ keys: [jwk] }))
    }
    return { calls, impl, config: accessConfig({ ACCESS_TEAM_DOMAIN: team, ACCESS_AUD: AUD }) }
  }
  const tokenWithKid = (team, kid) => sign({ ...good(), iss: `https://${team}` }, { kid })

  it('fetches the certs at most twice for any number of unknown kids in one cooldown', async () => {
    const team = 'amp-serial.cloudflareaccess.com'
    const { calls, impl, config } = certsServer(team)
    const t0 = Date.now()
    for (let i = 0; i < 20; i++) {
      expect(await verifyAccessJwt(await tokenWithKid(team, `random-${i}`), config, { fetchImpl: impl, now: t0 + i * 100 })).toBeNull()
    }
    expect(calls.n).toBeLessThanOrEqual(2)
  })

  it('shares one fetch between concurrent requests', async () => {
    const team = 'amp-parallel.cloudflareaccess.com'
    const { calls, impl, config } = certsServer(team)
    const tokens = await Promise.all(Array.from({ length: 20 }, (_, i) => tokenWithKid(team, `random-${i}`)))
    const t0 = Date.now()
    await Promise.all(tokens.map((t) => verifyAccessJwt(t, config, { fetchImpl: impl, now: t0 })))
    expect(calls.n).toBeLessThanOrEqual(2)
  })

  it('still picks up a rotated key once the cooldown has passed', async () => {
    const team = 'amp-rotate.cloudflareaccess.com'
    let served = 'k1'
    const { calls, impl, config } = certsServer(team, () => served)
    const t0 = Date.now()
    expect(await verifyAccessJwt(await tokenWithKid(team, 'k1'), config, { fetchImpl: impl, now: t0 })).not.toBeNull()
    served = 'k2' // Access rotated its signing key
    expect(await verifyAccessJwt(await tokenWithKid(team, 'k2'), config, { fetchImpl: impl, now: t0 + 60_000 })).not.toBeNull()
    expect(calls.n).toBe(2)
  })
})
