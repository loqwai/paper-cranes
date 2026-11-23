#!/usr/bin/env node
// Make (or update) a show repo: a stripped copy of paper-cranes that shares its git history and
// serves one shader at https://<name>.beadfamous.com/. See docs/show-repos.md and the /show-repo skill.
//
//   node scripts/show-repo/create.js <name> --shader <path> [--controller <name>]... [--param k=v]...
//        [--base <ref>] [--merge <ref>]... [--dir <dir>] [--midi-profiles <json>]
//        [--owner loqwai] [--repo show-<name>] [--domain <name>.beadfamous.com]
//        [--dry-run] [--skip-build] [--skip-verify] [--publish] [--visibility private|public]
//   node scripts/show-repo/create.js --sync [--from <ref>] [--dir <show repo>]
//
// Local steps (always): clone base -> merge extra refs -> strip -> build -> verify in headless Chromium.
// Every step converges: rerunning skips what is already done and commits only real changes.
// Outward-facing steps (GitHub repo, secrets, push, Cloudflare deploy) are printed and run only
// with --publish. --dry-run never runs them, whatever else is passed.
import { execFileSync, spawn } from 'child_process'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, resolve, dirname } from 'path'
import { createServer } from 'net'
import { fileURLToPath } from 'url'
import { makeConfig, showJson, planStrip, wranglerConfig, deployWorkflow, showReadme, publishPlan } from './plan.js'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const SOURCE = resolve(SCRIPT_DIR, '../..')
const SHOW_FILES = { workflow: '.github/workflows/show-deploy.yml', wrangler: 'wrangler.jsonc', readme: 'README.md', config: 'show.json' }
const README_MARK = '<!-- show-repo -->'
// Files a show repo owns outright: on a merge from main, the show's side always wins.
const OURS_ON_MERGE = ['index.html', 'README.md', 'show.json', 'wrangler.jsonc', 'shader-dates.json', 'vjpad-layouts.json']

const log = (msg) => console.log(`[show-repo] ${msg}`)
const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim()
const gitOk = (cwd, ...args) => { try { git(cwd, ...args); return true } catch { return false } }
const run = (cwd, cmd, args) => execFileSync(cmd, args, { cwd, stdio: 'inherit' })
const readIn = (dir) => (path) => (existsSync(join(dir, path)) ? readFileSync(join(dir, path), 'utf-8') : null)

const parseArgs = (argv) => {
    const out = { controllers: [], params: {}, merge: [] }
    const take = () => argv.shift()
    while (argv.length) {
        const arg = take()
        if (!arg.startsWith('--')) { out.name = arg; continue }
        const key = arg.slice(2)
        if (['dry-run', 'skip-build', 'skip-verify', 'publish', 'sync'].includes(key)) { out[key] = true; continue }
        const value = take()
        if (value === undefined) throw new Error(`${arg} needs a value`)
        if (key === 'controller') out.controllers.push(value)
        else if (key === 'merge') out.merge.push(value)
        else if (key === 'param') {
            const i = value.indexOf('=')
            if (i < 1) throw new Error(`--param ${value}: expected key=value`)
            out.params[value.slice(0, i)] = value.slice(i + 1)
        } else out[key] = value
    }
    return out
}

// ---- step 1: the clone -------------------------------------------------------------------------

const ensureClone = (dir, config, mergeRefs) => {
    if (existsSync(join(dir, '.git'))) {
        const branch = git(dir, 'rev-parse', '--abbrev-ref', 'HEAD')
        if (branch !== config.branch) throw new Error(`${dir} is on ${branch}, expected ${config.branch}`)
        log(`clone exists at ${dir} (${config.branch} @ ${git(dir, 'rev-parse', '--short', 'HEAD')})`)
    } else {
        const ref = git(SOURCE, 'rev-parse', '--symbolic-full-name', config.base) || config.base
        const sha = git(SOURCE, 'rev-parse', config.base)
        log(`cloning ${config.base} (${sha.slice(0, 8)}) into ${dir}`)
        mkdirSync(dir, { recursive: true })
        git(dir, 'init', '-q', '-b', config.branch)
        git(dir, 'fetch', '-q', SOURCE, `${ref}:refs/remotes/base/base`)
        git(dir, 'reset', '-q', '--hard', 'refs/remotes/base/base')
        git(dir, 'remote', 'add', 'upstream', config.upstream)
    }
    // Branches the show needs that are not on main yet (e.g. the shader's own branch). Merged, not
    // copied, so their history comes along.
    for (const ref of mergeRefs) {
        const full = git(SOURCE, 'rev-parse', '--symbolic-full-name', ref) || ref
        const local = `refs/remotes/merge/${ref.replace(/[^A-Za-z0-9._/-]/g, '-')}`
        git(dir, 'fetch', '-q', SOURCE, `+${full}:${local}`)
        if (gitOk(dir, 'merge-base', '--is-ancestor', local, 'HEAD')) { log(`${ref}: already merged`); continue }
        log(`merging ${ref}`)
        git(dir, 'merge', '-q', '--no-ff', '--no-edit', '-m', `show-repo: merge ${ref}`, local)
    }
}

// ---- step 2: the strip -------------------------------------------------------------------------

const assertCleanExceptGenerated = (dir) => {
    const changed = [...git(dir, 'diff', '--name-only', 'HEAD').split('\n'), ...git(dir, 'ls-files', '--others', '--exclude-standard').split('\n')]
    const dirty = changed.filter(Boolean).filter((path) => path !== 'shader-dates.json')
    if (dirty.length) throw new Error(`uncommitted changes in ${dir}: ${dirty.join(', ')}. Commit or discard them first.`)
}

const writeIfChanged = (dir, path, text) => {
    const full = join(dir, path)
    if (existsSync(full) && readFileSync(full, 'utf-8') === text) return false
    mkdirSync(dirname(full), { recursive: true })
    writeFileSync(full, text)
    return true
}

/** Converge the tree on a show repo. `previousShowHtml` is show.html before a sync merge. */
const strip = (dir, config, { midiProfiles, previousShowHtml } = {}) => {
    const read = readIn(dir)
    const files = git(dir, 'ls-files').split('\n').filter(Boolean)
    const remove = planStrip(files, config, read)
    if (remove.length) {
        execFileSync('git', ['rm', '-rq', '--pathspec-from-file=-'], { cwd: dir, input: remove.join('\n') })
        log(`stripped ${remove.length} files`)
    }

    const showHtml = read('show.html')
    if (!showHtml) throw new Error('show.html is missing: the base predates show mode. Pass --merge <a ref with show mode> or base on main.')
    const index = read('index.html') ?? ''
    // The show repo's / is the show page. Replace main's index once; after a sync, follow show.html
    // only while index.html is still an untouched copy (per-show edits to index.html are kept).
    const untouchedCopy = previousShowHtml != null && index === previousShowHtml
    if (!index.includes('id="show-config"') || untouchedCopy) {
        if (writeIfChanged(dir, 'index.html', showHtml)) log('index.html <- show.html')
    } else if (previousShowHtml != null && showHtml !== previousShowHtml) {
        log('WARNING: show.html changed on main but index.html has per-show edits; merge them by hand')
    }

    const existing = read(SHOW_FILES.config) ? JSON.parse(read(SHOW_FILES.config)) : {}
    const baseSha = existing.base ?? git(dir, 'rev-parse', 'refs/remotes/base/base')
    const json = { ...existing, ...showJson(config, { baseSha, midiProfiles: midiProfiles ?? existing.midiProfiles }) }
    writeIfChanged(dir, SHOW_FILES.config, `${JSON.stringify(json, null, 2)}\n`)
    if (!read(SHOW_FILES.wrangler)) writeIfChanged(dir, SHOW_FILES.wrangler, wranglerConfig(config, new Date().toISOString().slice(0, 10)))
    writeIfChanged(dir, SHOW_FILES.workflow, deployWorkflow())
    if (!(read(SHOW_FILES.readme) ?? '').includes(README_MARK)) writeIfChanged(dir, SHOW_FILES.readme, `${README_MARK}\n${showReadme(config)}`)

    // The build regenerates shader-dates.json from this clone's history; do it now so the strip
    // commit already holds what every later build writes, and reruns stay clean.
    try { execFileSync('node', ['scripts/shader-dates.js'], { cwd: dir, stdio: 'ignore' }) } catch { /* keep the baked file */ }

    git(dir, 'add', '-A')
    if (gitOk(dir, 'diff', '--cached', '--quiet')) return log('strip: nothing to change')
    git(dir, 'commit', '-q', '-m', `show-repo: strip to ${config.name}`, '-m', `Keeps shaders/${config.shader}.frag and controllers ${config.controllers.join(', ') || '(none)'}.\n\nShow-Repo: ${config.name}`)
    log(`committed ${git(dir, 'rev-parse', '--short', 'HEAD')} show-repo: strip to ${config.name}`)
}

// ---- sync: pull main into an existing show repo ------------------------------------------------

const sync = (dir, from) => {
    const saved = JSON.parse(readFileSync(join(dir, 'show.json'), 'utf-8'))
    const [owner, repo] = (saved.repo ?? '').split('/')
    const config = makeConfig({ ...saved, owner: owner || undefined, repo: repo || undefined })
    assertCleanExceptGenerated(dir)
    if (!from) { git(dir, 'fetch', '-q', 'upstream', 'main'); from = 'upstream/main' }
    const previousShowHtml = readIn(dir)('show.html')
    log(`merging ${from}`)
    gitOk(dir, 'merge', '--no-ff', '--no-commit', from)
    const conflicts = git(dir, 'diff', '--name-only', '--diff-filter=U').split('\n').filter(Boolean)
    const unresolved = []
    for (const path of conflicts) {
        if (OURS_ON_MERGE.includes(path) && existsSync(join(dir, path))) { git(dir, 'checkout', '--ours', '--', path); git(dir, 'add', '--', path); continue }
        // modify/delete: main changed a file this show deleted. Keep it deleted; strip decides again.
        if (!gitOk(dir, 'cat-file', '-e', `HEAD:${path}`)) { git(dir, 'rm', '-q', '--', path); continue }
        unresolved.push(path)
    }
    if (unresolved.length) throw new Error(`merge conflicts need a human: ${unresolved.join(', ')} (resolve, commit, then rerun --sync)`)
    if (!gitOk(dir, 'diff', '--cached', '--quiet')) git(dir, 'commit', '-q', '--no-edit', '-m', `show-repo: merge ${from}`)
    else gitOk(dir, 'merge', '--abort')
    strip(dir, config, { previousShowHtml })
    return config
}

// ---- step 3: build and verify ------------------------------------------------------------------

const build = (dir) => {
    if (!existsSync(join(dir, 'node_modules'))) { log('npm ci'); run(dir, 'npm', ['ci', '--no-audit', '--no-fund', '--loglevel=error']) }
    log('npm run build')
    run(dir, 'npm', ['run', 'build', '--silent'])
}

const freePort = () => new Promise((res, rej) => {
    const srv = createServer()
    srv.listen(0, '127.0.0.1', () => { const { port } = srv.address(); srv.close(() => res(port)) })
    srv.on('error', rej)
})

const waitForHttp = async (url, ms = 30000) => {
    const end = Date.now() + ms
    while (Date.now() < end) {
        try { if ((await fetch(url)).ok) return } catch { /* not up yet */ }
        await new Promise((r) => setTimeout(r, 250))
    }
    throw new Error(`${url} did not come up in ${ms}ms`)
}

const verifyBuild = async (dir, config) => {
    const port = await freePort()
    const server = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: dir, stdio: 'ignore' })
    try {
        const url = `http://127.0.0.1:${port}/`
        await waitForHttp(url)
        const { verifyShow } = await import('./verify.js')
        const shot = resolve(dir, '..', `${config.name}-verify.png`)
        const report = await verifyShow(url, { shot, expectShader: config.shader })
        console.log(JSON.stringify(report, null, 2))
        return report
    } finally {
        server.kill()
    }
}

// ---- step 4: outward-facing --------------------------------------------------------------------

const printPlan = (steps) => {
    log('outward-facing steps (run only with --publish):')
    for (const { what, cmd } of steps) console.log(`${what ? `  # ${what}\n` : ''}  ${cmd.map((c) => (/[\s"']/.test(c) ? JSON.stringify(c) : c)).join(' ')}`)
}

const main = async () => {
    const args = parseArgs(process.argv.slice(2))
    let config
    let dir
    if (args.sync) {
        dir = resolve(args.dir ?? process.cwd())
        config = sync(dir, args.from)
    } else {
        config = makeConfig({ ...args, controllers: args.controllers })
        dir = resolve(args.dir ?? join(SOURCE, '.show-repos', config.name))
        ensureClone(dir, config, args.merge)
        assertCleanExceptGenerated(dir)
        const midiProfiles = args['midi-profiles'] ? JSON.parse(readFileSync(args['midi-profiles'], 'utf-8')) : undefined
        strip(dir, config, { midiProfiles: midiProfiles?.profiles ?? midiProfiles })
    }
    if (!args['skip-build']) build(dir)
    if (!args['skip-build'] && !args['skip-verify']) {
        const report = await verifyBuild(dir, config)
        if (!report.ok) { log('verify FAILED; not publishing'); process.exit(1) }
        log(`verify ok: ${report.frames} frames, ${report.consoleErrorCount} console errors, screenshot ${report.screenshot}`)
    }
    const steps = publishPlan(config, dir, { visibility: args.visibility })
    printPlan(steps)
    if (args['dry-run'] || !args.publish) return log(args['dry-run'] ? 'dry run: stopped before outward-facing steps' : 'pass --publish to run them')
    for (const { what, cmd } of steps) {
        if (what) log(what)
        run(dir, cmd[0], cmd.slice(1))
    }
}

main().catch((e) => { console.error(`[show-repo] ${e.message}`); process.exit(1) })
