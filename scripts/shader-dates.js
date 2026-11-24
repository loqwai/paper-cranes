/**
 * Last-modified dates for shaders.
 *
 * Why this file exists
 * --------------------
 * Sorting the list page by "newest" needs a real per-shader date. Filesystem
 * mtime is useless in CI (a checkout stamps every file with the build time), so
 * the dates come from git history instead.
 *
 * But Cloudflare Pages clones **shallow (depth 1)**. In a shallow clone there is
 * exactly one commit and git reports every file as added by it, so a per-file
 * `git log` hands back the same timestamp for all 346 shaders — which sorts
 * nothing, and looks perfectly healthy because every entry still *has* a date.
 * That shipped once; presence is not correctness.
 *
 * So the real history is baked into a committed `shader-dates.json` and the
 * build prefers it whenever live history is unavailable or degenerate. Live git
 * still wins when it is genuinely usable (i.e. local dev), so the file does not
 * need babysitting during normal work — it is refreshed automatically.
 */
import { execFile } from 'child_process'
import { promisify } from 'util'
import { readFile, writeFile } from 'fs/promises'
import { pathToFileURL } from 'url'

const execFileAsync = promisify(execFile)

export const SHADER_DIR = 'shaders'
export const DATES_FILE = 'shader-dates.json'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T/

/** A single date across the whole repo means the history is a shallow graft, not real history. */
export const distinctDateCount = (dates) => new Set([...dates.values()].filter(Boolean)).size

/** @returns {Promise<boolean>} true when the clone has no real history (or git is unusable) */
export const isShallowRepo = async () => {
  try {
    const { stdout } = await execFileAsync('git', ['rev-parse', '--is-shallow-repository'])
    return stdout.trim() === 'true'
  } catch {
    return true // no git at all is, for our purposes, the same as no history
  }
}

/**
 * Last-commit date per shader file, newest-first from a single `git log` pass.
 * @returns {Promise<Map<string, string>>} posix path -> ISO date
 */
export const gitModifiedDates = async () => {
  const dates = new Map()
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['log', '--format=%cI', '--name-only', '--diff-filter=AMRC', '--', SHADER_DIR],
      { maxBuffer: 128 * 1024 * 1024 }
    )
    let current = null
    for (const line of stdout.split('\n')) {
      if (!line) continue
      if (ISO_DATE.test(line)) {
        current = line.trim()
        continue
      }
      if (!line.endsWith('.frag')) continue
      if (!dates.has(line)) dates.set(line, current) // log is newest-first, so first wins
    }
  } catch {
    // No git — caller falls back to the baked file.
  }
  return dates
}

/**
 * Shader files with uncommitted changes — their git date is stale, so prefer mtime.
 * @returns {Promise<Set<string>>} posix paths
 */
export const gitDirtyFiles = async () => {
  const dirty = new Set()
  try {
    const { stdout } = await execFileAsync('git', ['status', '--porcelain', '-uall', '--', SHADER_DIR], {
      maxBuffer: 16 * 1024 * 1024,
    })
    for (const line of stdout.split('\n')) {
      if (!line.trim()) continue
      const path = line.slice(3).trim().split(' -> ').pop().replace(/^"|"$/g, '')
      if (path.endsWith('.frag')) dirty.add(path)
    }
  } catch {
    // No git — nothing is known-dirty.
  }
  return dirty
}

/** @returns {Promise<Record<string, string>>} baked dates, or {} when absent */
export const readBakedDates = async () => {
  try {
    return JSON.parse(await readFile(DATES_FILE, 'utf-8'))
  } catch {
    return {}
  }
}

/**
 * Live history when it is trustworthy, otherwise the committed fallback.
 * @returns {Promise<{dates: Map<string,string>, source: string, live: Map<string,string>, usable: boolean}>}
 */
export const resolveDates = async () => {
  const [live, shallow, baked] = await Promise.all([gitModifiedDates(), isShallowRepo(), readBakedDates()])
  const usable = !shallow && distinctDateCount(live) > 1

  if (usable) return { dates: live, source: 'git history', live, usable }

  const dates = new Map(Object.entries(baked))
  const reason = shallow ? 'shallow clone' : 'degenerate git history'
  return { dates, source: `${DATES_FILE} (${reason})`, live, usable }
}

/**
 * The baked file's exact text: only shaders that still exist (git log also names
 * deleted and renamed-away files), keys in code-point order so the bytes never
 * depend on the machine's locale.
 * @param {Map<string,string>} dates
 * @param {Set<string>} [existing] posix paths of shaders on disk; omit to keep every entry
 */
export const bakedDatesText = (dates, existing) => {
  const entries = [...dates.entries()].filter(([path]) => !existing || existing.has(path))
  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  return `${JSON.stringify(Object.fromEntries(entries), null, 2)}\n`
}

/**
 * Writes the baked file when its text would change. Only ever called when live history is trustworthy.
 * @returns {Promise<{count: number, written: boolean}>}
 */
export const writeBakedDates = async (dates, { existing, file = DATES_FILE } = {}) => {
  const text = bakedDatesText(dates, existing)
  const count = Object.keys(JSON.parse(text)).length
  const current = await readFile(file, 'utf-8').catch(() => null)
  if (current === text) return { count, written: false }
  await writeFile(file, text)
  return { count, written: true }
}

/**
 * Should a dev-server start or build refresh the committed baked file? Only when
 * history is real AND this tree is already changing shaders, so the refresh rides
 * along with that commit. A clean checkout (CI, an agent's gate run) must leave
 * `git status` clean; `npm run shader-dates` refreshes it on purpose.
 */
export const shouldAutoRefreshBake = ({ usable, dirtyShaderCount }) => usable && dirtyShaderCount > 0

/** @returns {Promise<Set<string>>} posix paths of the shaders git tracks */
export const trackedShaderFiles = async () => {
  const { stdout } = await execFileAsync('git', ['ls-files', '--', SHADER_DIR], { maxBuffer: 16 * 1024 * 1024 })
  return new Set(stdout.split('\n').filter((line) => line.endsWith('.frag')))
}

const main = async () => {
  const live = await gitModifiedDates()
  const distinct = distinctDateCount(live)

  if (await isShallowRepo()) {
    console.error(`[shader-dates] Refusing to write: this clone is shallow, so ${DATES_FILE} would be wrong.`)
    console.error('[shader-dates] Run `git fetch --unshallow` first.')
    process.exit(1)
  }
  if (distinct <= 1) {
    console.error(`[shader-dates] Refusing to write: only ${distinct} distinct date(s) found across history.`)
    process.exit(1)
  }

  const { count, written } = await writeBakedDates(live, { existing: await trackedShaderFiles() })
  console.log(`[shader-dates] ${written ? 'Wrote' : 'Unchanged'} ${DATES_FILE}: ${count} shaders, ${distinct} distinct dates.`)
}

// pathToFileURL, not `file://${argv[1]}` — on Windows argv[1] is a backslash path
// and the naive comparison never matches, so the CLI silently does nothing.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
