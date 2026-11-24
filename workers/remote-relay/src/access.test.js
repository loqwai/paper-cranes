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
