// Per-machine token for the remote-inspect channel (docs/remote-inspect.md). Lives outside the
// repo and outside anything Vite serves, so only the loopback-gated dev endpoint and the CLI see it.
import { randomBytes } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'

export const TOKEN_FILE = process.env.CRANES_REMOTE_TOKEN_FILE || join(homedir(), '.config', 'paper-cranes', 'remote-inspect-token')

export const writeInspectToken = (token = randomBytes(24).toString('base64url')) => {
  mkdirSync(dirname(TOKEN_FILE), { recursive: true, mode: 0o700 })
  writeFileSync(TOKEN_FILE, token + '\n', { mode: 0o600 })
  chmodSync(TOKEN_FILE, 0o600)
  return token
}

// Read on every call so `cranes-remote token rotate` takes effect without a dev-server restart.
export const readInspectToken = () => {
  try {
    const t = readFileSync(TOKEN_FILE, 'utf8').trim()
    if (t) return t
  } catch {}
  return writeInspectToken()
}
