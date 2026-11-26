# Show repos: one show, one repo

A show repo is paper-cranes stripped down to one shader and its controller. It shares main's git
history, has room for custom per-show code, and deploys on every push to
`https://<show>.beadfamous.com/`. Its front page is the show page: the canvas, MIDI, remote
jamming, snapshots, and nothing drawn on top.

- Make one: `/show-repo <name> <shader> [controller]`, or
  `node scripts/show-repo/create.js <name> --shader <path> [--controller <name>]... [--param k=v]...`
- Storyboard: [draw board `paper-cranes-show-repos`](https://draw.hypnodroid.com/b/paper-cranes-show-repos)
  (Present path `show-repo-storyboard`)

## The flow

1. **Clone.** `create.js` clones `--base` (default `origin/main`) into `.show-repos/<name>/` (git-ignored)
   on branch `show/<name>`. It then merges each `--merge <ref>`, which brings in a shader branch
   that is not on main yet, history included.
2. **Strip.** One commit deletes everything the show does not serve (see the recipe below) and adds
   `show.json`, `index.html` (a copy of `show.html`), `wrangler.jsonc`,
   `.github/workflows/show-deploy.yml` and a show README.
3. **Build and verify.** `npm ci && npm run build`, then `vite preview` and
   `scripts/show-repo/verify.js` in headless Chromium.
4. **Publish** (only with `--publish`; `--dry-run` never does): create the GitHub repo, set two
   secrets, and push `show/<name>` as `main`. The workflow then deploys the Worker and its custom
   domain. [The exact commands](#publishing-the-outward-facing-steps) are below.

The local steps (1-3) converge. A rerun reuses the clone, skips merged refs, and commits only real
changes (`strip: nothing to change`). The publish steps are not one transaction. Each step that
would fail or prompt again on a rerun has a read-only check that skips it once done:
`gh repo view`, `git remote get-url origin`, and `gh secret list` for each secret. The pushes are
no-ops when there is nothing new. So `--publish` can be rerun after a failure halfway through.

## The strip recipe

The recipe is data in `scripts/show-repo/plan.js` (`DROP`, `KEEP_IMAGES`, `planStrip`). It drops by
name, so anything new on main is kept until someone decides otherwise. A new module can therefore
never break a show by being left out.

| Kept | Dropped |
| --- | --- |
| `src/` whole: Visualizer, audio pipeline + workers, wavelet, controller chain, MidiMapper, remote WS display/control, ParamsManager, `?vj=1` runtime | `edit.*`, `list.*`, `analyze.*`, `playlist.*`, `nfc-writer.html`, `vj.*`, `jam.html`/`jam.js` (the show page replaces jam), `codicon.ttf`, `BarGraph.css` |
| `show.html` → `index.html`, `show.js`, `jam.css` | every shader except `shaders/<shader>.frag` and its `<dir>.md` |
| `midi.html` (mapping page), `vjpad.html` + `vjpad-layouts.json` | every controller outside the named ones' import closure (`.test.js` files kept) |
| the named controllers + what they import from `controllers/` | `public/images/*` except `placeholder-image.png` |
| `scripts/`, `.agents/skills/` and its `.claude/skills/` copy, `docs/`, `vite-plugins/`, `public/` worklets and icons | `journals/`, `prompts/`, `e2e/`, `vscode-extension/`, `workers/`, main's `.github/workflows/`, handoff notes |

The multiplayer editor code stays in `src/` but nothing imports it, so Vite never bundles it. The
PWA manifests shrink to one automatically, because the shader plugin only sees one shader.
The clit dry run removed 742 files, and its `dist/` is 692 KB.

## Shared history, and pulling main in later

A show repo is a branch of paper-cranes: it is cloned from main and the strip is an ordinary commit.
So `git merge` works in both directions. The show repo has `upstream` set to
`github.com/loqwai/paper-cranes`. To take main's fixes:

```bash
cd .show-repos/<name>          # or the show repo's own checkout
node scripts/show-repo/create.js --sync          # git fetch upstream main && merge, then re-strip
```

`--sync` runs in the current directory unless `--dir` names the show repo. It refuses a directory
without a `show.json`, or one not on that show's `show/<name>` branch. It then resolves the expected
conflicts itself and stops for a human on anything else:

- **modify/delete** (main edited a file the show dropped): the file stays deleted.
- **show-owned files** (`index.html`, `README.md`, `show.json`, `wrangler.jsonc`,
  `shader-dates.json`, `vjpad-layouts.json`): the show's version wins.
- **re-strip**: shaders and controllers that main added are removed again.
- **`index.html`** follows main's `show.html` while it is still an untouched copy. If the show has
  edited `index.html`, it is kept and a warning names the drift.

Tested against a fake main commit that edited a dropped file, added a shader and changed
`show.html`. All three resolved without a prompt. Per-show code belongs in the controller,
`show.json`, or new files, not in edits to shared `src/` files. That keeps merges clean.

## The show page contract (`show.html`, on main)

The show page lives on main so every show repo inherits it and its fixes.

- **Nothing on screen.** Canvas only. `jam.css` hides the cursor and RemoteDisplay's status chip.
  There is no PWA tap gesture and no analytics tag. Feedback goes to the console.
- **Boots from a bare URL.** `src/show/boot.js` runs before `index.js` and fills the URL from
  `show.json` (inlined at build time by `vite-plugins/show-config-plugin.js`): shader, controllers,
  params. Anything already in the URL wins. On main, the block is `{}` and `/show.html?shader=…`
  works like the jam page.
- **MIDI always on.** `src/midi.js` loads on every page load. Knob moves go through ParamsManager
  into the URL, so a refresh keeps the set's state. `show.json` may carry `midiProfiles`
  (the `cranes-midi-profiles` shape), which seeds devices this browser has never mapped. A browser's
  own mapping is never overwritten. Pass `--midi-profiles <file>` to `create.js` to ship one.
- **Remote jamming.** `?room=<secret>` makes the page a display in that relay room. A phone then
  drives it at `vjpad.html?room=<secret>&shader=<shader>`. Under `npm run dev`, `?remote=display`
  still uses the dev server's `/ws`.
- **Snapshots.** Space saves and Backspace drops the last one. On the dev server they go to
  `/__snapshot-preset` as on the jam page. On a static host they stay in this browser's
  localStorage (`window.showSnapshots()` lists them), because a 404 is a red console line on show night.
- **No surprise reloads.** The service worker's "a file changed, reload every client" message is
  ignored on show pages, as it is on jam. A deploy never blanks the wall mid-set; the new build
  shows on the next manual refresh.

## Hosting

### What the static host must provide

Show pages are static files. Only two runtime services exist, and both already run elsewhere:

- **Remote control.** The `/ws` socket is a Vite dev-server plugin (`vite-plugins/remote-ws-plugin.js`)
  and does not exist on any static host. `src/remote/WebSocketClient.js` already switches to
  `wss://relay.beadfamous.com/ws/<room>` whenever `?room=` is present. That is the deployed relay
  Worker (`workers/remote-relay`), one Durable Object per room. A show needs nothing new, only a
  room name that is hard to guess: **the room name is the only access control**, so treat it as a
  password and keep it out of the repo, `show.json` and posters.
- **Snapshots and `?vj=1` signals** (`/__snapshot-preset`, `/__vj-signal`) are dev-only endpoints. On a
  static host, snapshots fall back to localStorage. A `?vj=1` page on a room (`?remote=display&room=`)
  sends its signals down the room socket to the relay MCP's `wait_for_event` (`src/vj/signals.js`);
  without a room they go nowhere.

### Options compared

Checked against Cloudflare's docs on 2026-11-22:
- [Workers best practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/)
  say to use Workers Static Assets for new projects, not Pages.
- [Pages limits](https://developers.cloudflare.com/pages/platform/limits/) are 100 projects per
  account; Workers allows 100 Workers on Free and 500 on paid.
- Static assets can be served under a path prefix with
  [`assets.base_path`](https://developers.cloudflare.com/workers/static-assets/routing/advanced/serving-a-subdirectory/)
  (Wrangler 4.148+, added 2026-11-11), which needs a matching Vite `base`.

| | (a) Pages per show + router Worker on `shows.beadfamous.com/<show>/*` proxying to `<show>.pages.dev` | (a′) Worker per show, route `shows.beadfamous.com/<show>/*`, `assets.base_path` | **(b) Worker per show on `<show>.beadfamous.com`** |
| --- | --- | --- | --- |
| Vite `base` | `/<show>/` (and pages.dev itself then serves broken asset paths) | `/<show>/` | `/` (unchanged) |
| App changes | Every root-absolute fetch must honour `BASE_URL` (below) | same | none |
| Shared parts to touch per show | router Worker's table | none | none |
| Platform | Pages: the legacy path, 100-project cap | Workers | Workers |
| Origin isolation | one origin for all shows: MIDI profiles shared, but also every show's service worker and localStorage | same | one origin per show |
| URL | `shows.beadfamous.com/clit` | `shows.beadfamous.com/clit` | `clit.beadfamous.com` (and `shows.beadfamous.com/clit` 302s there) |

The app fetches root-absolute paths that a sub-path mount breaks:
- `/window-processor.js` and `/raw-tap-processor.js` (audio worklets)
- `/controllers/<name>.js` (`src/controllerChain.js`)
- `/shaders/<path>.frag` (`src/utils.js`, `src/worker-communication.js`)
- `/service-worker.js`, `/manifests/*.json`, `/icons/*`, and `/shaders.json` (vjpad)

**Recommendation: (b).** Each show is a static-assets Worker on its own subdomain, plus the
one-time `shows.beadfamous.com/<show>` 302 redirect (`workers/shows-redirect`).
- It needs no app changes. The sub-path options must fix at least eight root-absolute call sites
  on main and keep them fixed; one regression is a silent 404 in a show.
- Nothing shared is touched per show. A new show is its own Worker, with DNS and certificate
  created by the Worker [custom domain](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
  on first deploy. `relay.beadfamous.com` already runs this way, which also confirms the zone is
  in the account.
- One show's service worker, cache or custom code cannot touch another show.
- The cost is per-origin MIDI profiles. `show.json`'s `midiProfiles` seed covers it, and keeps the
  mapping in git where it belongs.

CI: a GitHub Actions workflow (`npm ci`, `npm run build`, `cloudflare/wrangler-action@v3 deploy`).
It is chosen over Cloudflare's own Git integration (Workers Builds) because every step can be
scripted with `gh`. Workers Builds needs a dashboard click to connect each repo.

## Publishing: the outward-facing steps

`create.js` prints these and runs them only with `--publish`, skipping any step its check shows is
already done. For the clit show:

```bash
gh repo create loqwai/show-clit --private --description "Paper Cranes show: clit"
git -C .show-repos/clit remote add origin https://github.com/loqwai/show-clit.git
gh secret set CLOUDFLARE_API_TOKEN -R loqwai/show-clit     # token: "Edit Cloudflare Workers" template, zone beadfamous.com
gh secret set CLOUDFLARE_ACCOUNT_ID -R loqwai/show-clit
git -C .show-repos/clit push -u origin show/clit:main        # triggers show-deploy.yml -> wrangler deploy
git -C .show-repos/clit push upstream show/clit              # optional: keep the branch on paper-cranes
gh run watch -R loqwai/show-clit
node scripts/show-repo/verify.js https://clit.beadfamous.com/
```

The first deploy creates the Worker `show-clit` and its custom domain `clit.beadfamous.com`
(Cloudflare adds the DNS record and certificate). The redirect needs one deploy, ever:
`cd workers/shows-redirect && npx wrangler deploy`.

## Verify

`node scripts/show-repo/verify.js <url> [--shot <png>] [--expect-shader <path>] [--real-midi]` loads
the page in headless Chromium with a fake mic. It passes only when all of these hold:
- frames advance and the picture is not black;
- the URL carries the expected shader;
- the controller chain emits features;
- MIDI starts, and a CC sent through a fake MIDI input reaches the URL as a knob value;
- no element besides the canvas is visible;
- the console has zero errors.

Each check waits for progress rather than sampling a fixed window. The timeouts are generous:
90 s to boot, 20 s for frames to advance or a knob to reach the URL, 60 s for the screenshot. A
heavily loaded machine therefore makes verify slower, not red.

The fake MIDI input exists because Chromium on WSL and CI has no MIDI backend
(`InvalidStateError: Platform dependent initialization failed`). Pass `--real-midi` on a machine
with a controller attached.

Clit dry run, 2026-11-22: all checks pass. 45 frames in headless SwiftShader, 74% of pixels lit,
55 controller features, a fake CC 7 auto-mapped to `knob_1` = 64/127 in the URL, 0 visible UI
elements, 0 console errors. The screenshot is written to `.show-repos/clit-verify.png`.

## Design record

Candidates considered (one lane, no arena: separate prompts, same model):

- **Fork and strip** (chosen). Clone main, make one strip commit, keep shared history, sync by merge
  plus an idempotent re-strip.
- **Overlay repo** (rejected). The show repo holds only its shader, controller and config, and pulls
  paper-cranes in as a submodule or package. It has no shared history, which Aaron asked for.
- **Branch per show in paper-cranes** (rejected). It has no new repo either, and the pages would
  ship every shader. It is still the fallback if per-repo overhead ever outweighs isolation.

For the show page: a `show.html` on main that the show repo copies to `index.html` was chosen over
a show-mode flag inside main's `index.html`. The flag would change the public
visuals.beadfamous.com page (tap-to-install, analytics), and every show's front page would then
depend on one shared file staying backwards compatible.
