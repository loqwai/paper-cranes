// Pure planning for show repos: what a show repo keeps, the files it adds, and the outward-facing
// commands that publish it. No I/O here; create.js does the work. See docs/show-repos.md.
import { posix } from 'path'

export const ZONE = 'beadfamous.com'
export const UPSTREAM = 'https://github.com/loqwai/paper-cranes.git'
// Subdomains already in use on the zone, or reserved for the show index.
export const RESERVED_NAMES = new Set(['www', 'visuals', 'relay', 'shows', 'api', 'draw'])

// Paths a show repo drops. Everything not listed stays (src/, scripts/, the audio pipeline, MIDI,
// remote control, vjpad, midi.html), so a new module on main never breaks a show by omission.
// shaders/ and controllers/ are pruned separately to the show's own files.
export const DROP = [
    // pages a show never serves
    'edit.html', 'edit.js', 'edit.css', 'codicon.ttf',
    'list.html', 'list.js',
    'analyze.html', 'analyze.js', 'analyze.css', 'BarGraph.css',
    'playlist.html', 'playlist.js', 'playlist.css',
    'nfc-writer.html',
    'vj.html', 'vj.js', 'vj.css',
    'jam.html', 'jam.js', // show.html is the jam page for a show; jam.css stays (show.html uses it)
    // main-repo working notes and tooling
    'journals', 'prompts', 'PROMPT.md', 'HANDOFF.md', 'RESUME.md', 'IRIS_VARIATIONS.md',
    'e2e', 'e2e-prompt.md', 'vitest.e2e.config.js', 'vscode-extension', 'workers',
    '.github/workflows',
]

// Files the show repo itself adds inside a dropped path; never stripped.
export const SHOW_OWNED = ['.github/workflows/show-deploy.yml']

// Images the show keeps from public/images: the default iChannel0 image index.js always loads.
export const KEEP_IMAGES = ['public/images/placeholder-image.png']

const NAME = /^[a-z][a-z0-9-]{1,30}[a-z0-9]$/

/** Validated show config from CLI-style options. Throws with the reason on bad input. */
export const makeConfig = ({ name, shader, controllers = [], params = {}, owner = 'loqwai', repo, domain, base, title }) => {
    if (!NAME.test(name ?? '')) throw new Error(`show name "${name}" must be 3-32 chars of a-z, 0-9 and -, starting with a letter`)
    if (RESERVED_NAMES.has(name)) throw new Error(`show name "${name}" is reserved (${[...RESERVED_NAMES].join(', ')})`)
    if (!shader) throw new Error('--shader is required (e.g. claude/wip/clit-vibej/2)')
    return {
        name,
        title: title ?? `Paper Cranes - ${name}`,
        shader: shader.replace(/^shaders\//, '').replace(/\.frag$/, ''),
        controllers: controllers.map((c) => c.replace(/^controllers\//, '').replace(/\.js$/, '')),
        params,
        owner,
        repo: repo ?? `show-${name}`,
        worker: `show-${name}`,
        domain: domain ?? `${name}.${ZONE}`,
        branch: `show/${name}`,
        upstream: UPSTREAM,
        base: base ?? 'origin/main',
    }
}

/** show.json: what boots the show (read by vite-plugins/show-config-plugin.js) and what made it. */
export const showJson = (config, { baseSha, midiProfiles } = {}) => ({
    name: config.name,
    title: config.title,
    shader: config.shader,
    controllers: config.controllers,
    params: config.params,
    ...(midiProfiles ? { midiProfiles } : {}),
    repo: `${config.owner}/${config.repo}`,
    domain: config.domain,
    upstream: config.upstream,
    ...(baseSha ? { base: baseSha } : {}),
})

const RELATIVE_IMPORT = /(?:import\s[^'"]*?from\s*|import\s*\(\s*|export\s[^'"]*?from\s*)['"](\.{1,2}\/[^'"]+)['"]/g

/**
 * Every controllers/ file the named controllers need: each controller, its .test.js, and the
 * controllers/ modules it imports relatively, followed transitively. `read(path)` returns a file's
 * text or null when it does not exist.
 */
export const controllerClosure = (names, read) => {
    const keep = new Set()
    const queue = names.map((name) => `controllers/${name}.js`)
    while (queue.length) {
        const path = queue.shift()
        if (keep.has(path)) continue
        const text = read(path)
        if (text == null) throw new Error(`controller file ${path} not found`)
        keep.add(path)
        const test = path.replace(/\.js$/, '.test.js')
        if (read(test) != null) keep.add(test)
        for (const [, rel] of text.matchAll(RELATIVE_IMPORT)) {
            const target = posix.normalize(posix.join(posix.dirname(path), rel))
            if (target.startsWith('controllers/')) queue.push(target)
        }
    }
    return keep
}

/**
 * Which tracked files to delete so the tree is a show repo. Idempotent: on an already-stripped
 * tree it returns nothing, and after merging main it returns exactly what main brought back.
 */
export const planStrip = (files, config, read) => {
    const shaderFile = `shaders/${config.shader}.frag`
    if (!files.includes(shaderFile)) throw new Error(`${shaderFile} is not in the base tree`)
    const shaderDir = posix.dirname(shaderFile)
    const keepShaders = new Set([shaderFile, `${shaderDir}/${posix.basename(shaderDir)}.md`])
    const keepControllers = controllerClosure(config.controllers, read)
    const keepImages = new Set(KEEP_IMAGES)
    const dropped = (file) => DROP.some((d) => file === d || file.startsWith(`${d}/`))
    return files.filter((file) => {
        if (SHOW_OWNED.includes(file)) return false
        if (dropped(file)) return true
        if (file.startsWith('shaders/')) return !keepShaders.has(file)
        if (file.startsWith('controllers/')) return !keepControllers.has(file)
        if (file.startsWith('public/images/')) return !keepImages.has(file)
        return false
    })
}

/** wrangler.jsonc: a static-assets Worker on the show's own subdomain. */
export const wranglerConfig = (config, date) => `{
  // Show "${config.name}": static assets only, no Worker script. Deployed by .github/workflows/deploy.yml.
  "name": "${config.worker}",
  "compatibility_date": "${date}",
  "assets": { "directory": "./dist" },
  "workers_dev": false,
  "routes": [{ "pattern": "${config.domain}", "custom_domain": true }]
}
`

export const deployWorkflow = () => `name: Deploy show
on:
  push:
    branches: [main]
  workflow_dispatch:
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: \${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: \${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy
`

export const showReadme = (config) => `# ${config.title}

One show, one shader: \`shaders/${config.shader}.frag\`${config.controllers.length ? ` driven by \`controllers/${config.controllers.join('.js`, `controllers/')}.js\`` : ''}.
Stripped from [paper-cranes](https://github.com/loqwai/paper-cranes) by \`scripts/show-repo/create.js\`,
sharing its git history. Live at **https://${config.domain}/**.

- **Wall:** https://${config.domain}/ (MIDI on, no UI). Add \`?room=<secret>\` to accept remote jamming.
- **Phone:** https://${config.domain}/vjpad.html?room=<secret>&shader=${config.shader}
- **MIDI mapping:** https://${config.domain}/midi.html
- **Dev:** \`npm install && npm run dev\`, then http://localhost:6969/

Boot config (shader, controllers, params, MIDI profiles) is \`show.json\`. Every push to \`main\`
deploys. Pull fixes from main with \`node scripts/show-repo/create.js --sync\`.
See docs/show-repos.md.
`

/** The outward-facing steps, in order. create.js prints them; only --publish runs them. */
export const publishPlan = (config, dir, { visibility = 'private' } = {}) => [
    { what: 'create the GitHub repo', cmd: ['gh', 'repo', 'create', `${config.owner}/${config.repo}`, `--${visibility}`, '--description', `Paper Cranes show: ${config.name}`] },
    { what: 'point origin at it', cmd: ['git', '-C', dir, 'remote', 'add', 'origin', `https://github.com/${config.owner}/${config.repo}.git`] },
    { what: 'set the deploy secrets (prompts for each value)', cmd: ['gh', 'secret', 'set', 'CLOUDFLARE_API_TOKEN', '-R', `${config.owner}/${config.repo}`] },
    { what: '', cmd: ['gh', 'secret', 'set', 'CLOUDFLARE_ACCOUNT_ID', '-R', `${config.owner}/${config.repo}`] },
    { what: 'push the show branch as main (triggers the deploy workflow)', cmd: ['git', '-C', dir, 'push', '-u', 'origin', `${config.branch}:main`] },
    { what: 'record the branch on paper-cranes too', cmd: ['git', '-C', dir, 'push', 'upstream', config.branch] },
    { what: 'watch the first deploy', cmd: ['gh', 'run', 'watch', '-R', `${config.owner}/${config.repo}`] },
    { what: 'verify the live URL', cmd: ['node', 'scripts/show-repo/verify.js', `https://${config.domain}/`] },
]
