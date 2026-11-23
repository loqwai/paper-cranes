import { describe, it, expect } from 'vitest'
import { makeConfig, planStrip, controllerClosure, publishPlan, wranglerConfig } from './plan.js'
import { injectShowConfig } from '../../vite-plugins/show-config-plugin.js'

const tree = {
    'index.html': '', 'show.html': '', 'show.js': '', 'jam.css': '', 'jam.html': '', 'jam.js': '',
    'edit.html': '', 'list.html': '', 'midi.html': '', 'vjpad.html': '',
    'src/Visualizer.js': '', 'src/midi/MidiMapper.js': '',
    'shaders/claude/wip/clit-vibej/1.frag': '',
    'shaders/claude/wip/clit-vibej/2.frag': '',
    'shaders/claude/wip/clit-vibej/clit-vibej.md': '',
    'shaders/plasma.frag': '',
    'controllers/clit-set.js': "import { ease } from './lib/ease.js'\n",
    'controllers/clit-set.test.js': '',
    'controllers/lib/ease.js': '',
    'controllers/sun.js': '',
    'public/images/placeholder-image.png': '', 'public/images/taco.png': '',
    'journals/2026-11-21.md': '', 'workers/remote-relay/src/index.js': '',
    '.github/workflows/auto-merge.yml': '', '.github/workflows/show-deploy.yml': '',
}
const files = Object.keys(tree)
const read = (path) => tree[path] ?? null
const clit = makeConfig({ name: 'clit', shader: 'claude/wip/clit-vibej/2', controllers: ['clit-set'] })

describe('planStrip', () => {
    const removed = new Set(planStrip(files, clit, read))
    const kept = files.filter((f) => !removed.has(f))

    it('keeps the one shader, its doc, its controller closure and the runtime', () => {
        expect(kept.sort()).toEqual([
            '.github/workflows/show-deploy.yml',
            'controllers/clit-set.js', 'controllers/clit-set.test.js', 'controllers/lib/ease.js',
            'index.html', 'jam.css', 'midi.html',
            'public/images/placeholder-image.png',
            'shaders/claude/wip/clit-vibej/2.frag', 'shaders/claude/wip/clit-vibej/clit-vibej.md',
            'show.html', 'show.js',
            'src/Visualizer.js', 'src/midi/MidiMapper.js',
            'vjpad.html',
        ])
    })

    it('is idempotent: a stripped tree strips to nothing', () => {
        expect(planStrip(kept, clit, read)).toEqual([])
    })

    it('refuses a shader the base does not have', () => {
        expect(() => planStrip(files, makeConfig({ name: 'nope', shader: 'missing/1' }), read)).toThrow(/not in the base tree/)
    })
})

describe('controllerClosure', () => {
    it('follows relative imports inside controllers/', () => {
        expect([...controllerClosure(['clit-set'], read)]).toContain('controllers/lib/ease.js')
    })

    it('names a missing controller', () => {
        expect(() => controllerClosure(['ghost'], read)).toThrow(/controllers\/ghost.js not found/)
    })
})

describe('makeConfig', () => {
    it('derives repo, worker, domain and branch from the name', () => {
        expect(clit).toMatchObject({ repo: 'show-clit', worker: 'show-clit', domain: 'clit.beadfamous.com', branch: 'show/clit' })
    })

    it('normalises shader and controller paths', () => {
        const c = makeConfig({ name: 'clit', shader: 'shaders/claude/wip/clit-vibej/2.frag', controllers: ['controllers/clit-set.js'] })
        expect([c.shader, c.controllers]).toEqual(['claude/wip/clit-vibej/2', ['clit-set']])
    })

    it('refuses subdomains already in use', () => {
        expect(() => makeConfig({ name: 'relay', shader: 'x' })).toThrow(/reserved/)
    })
})

describe('publishPlan', () => {
    it('creates the repo before pushing to it, and verifies last', () => {
        const cmds = publishPlan(clit, '/tmp/clit').map((s) => s.cmd.join(' '))
        expect(cmds[0]).toBe('gh repo create loqwai/show-clit --private --description Paper Cranes show: clit')
        expect(cmds.findIndex((c) => c.includes('push -u origin show/clit:main'))).toBeGreaterThan(0)
        expect(cmds.at(-1)).toBe('node scripts/show-repo/verify.js https://clit.beadfamous.com/')
    })
})

describe('publish reruns', () => {
    const steps = publishPlan(clit, '/tmp/clit')
    const doneFor = (needle) => steps.find((s) => s.cmd.join(' ').includes(needle)).done

    it('skips creating a repo that already exists', () => {
        expect(doneFor('repo create').cmd.join(' ')).toBe('gh repo view loqwai/show-clit')
    })

    it('skips adding an origin that is already set', () => {
        expect(doneFor('remote add').cmd.join(' ')).toBe('git -C /tmp/clit remote get-url origin')
    })

    it('skips a secret that is already set', () => {
        expect(doneFor('CLOUDFLARE_API_TOKEN')).toEqual({ cmd: ['gh', 'secret', 'list', '-R', 'loqwai/show-clit'], includes: 'CLOUDFLARE_API_TOKEN' })
    })
})

describe('wranglerConfig', () => {
    it('names the workflow that actually deploys it', () => {
        expect(wranglerConfig(clit, '2026-11-22')).toContain('.github/workflows/show-deploy.yml')
    })
})

describe('injectShowConfig', () => {
    const page = '<head><script type="application/json" id="show-config">{}</script></head>'

    it('fills the show-config block', () => {
        expect(injectShowConfig(page, { shader: 'a/1' })).toContain('id="show-config">{"shader":"a/1"}</script>')
    })

    it('leaves pages without the block alone', () => {
        expect(injectShowConfig('<head></head>', { shader: 'a/1' })).toBe('<head></head>')
    })

    it('cannot be closed early by a value in the config', () => {
        const html = injectShowConfig(page, { title: '</script><script>alert(1)</script>' })
        expect(html.match(/<\/script>/g)).toHaveLength(1)
    })
})
