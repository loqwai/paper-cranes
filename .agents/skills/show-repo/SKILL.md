---
name: show-repo
description: "Make a repo for one show: strip paper-cranes down to one shader + its controller, keep the shared git history, build, verify the show page in headless Chromium, then (with Aaron's go-ahead) create the GitHub repo and deploy it to https://<show>.beadfamous.com/. Usage: `/show-repo <name> <shader-path> [controller] [k=v ...]`, `/show-repo sync <name>` (pull main's fixes into a show repo), `/show-repo publish <name>`."
allowed-tools: Bash Read Write Edit Grep Glob
---

# show-repo: one show, one repo

Design, strip recipe, hosting and the publish commands: **[docs/show-repos.md](../../../docs/show-repos.md)**.
The script does the work; this skill decides the arguments and reports.

## Make one (local, safe to rerun)

1. Resolve the arguments.
   - `<name>`: the subdomain, 3-32 chars `a-z0-9-`. `www`, `visuals`, `relay`, `shows`, `api` and
     `draw` are refused.
   - `<shader-path>`: the path under `shaders/`, no `.frag`.
   - `controller`: the one the show runs. Look at the shader's `// preset:` line and the `/show`
     skill's pairings (`clit-set/N` goes with `clit-set`, and so on).
   - `k=v` params: from the shader's `// preset:` URL, minus `shader` and `controller` (for
     example `wavelet=true coaster=1`).
2. If the shader is not on `origin/main` yet, find its branch (`git branch -r --contains`, or
   `git log --all -- shaders/<path>.frag`) and pass it as `--merge <ref>`. Merging keeps its history.
3. Run:
   ```bash
   node scripts/show-repo/create.js <name> --shader <path> --controller <c> --param k=v ... [--merge <ref>] --dry-run
   ```
   It clones into `.show-repos/<name>/`, strips, builds, verifies, and prints the outward-facing
   steps without running them.
4. Report the verify JSON: `ok`, frames, `consoleErrorCount`, `visibleUi`, the MIDI CC result, and
   the screenshot path (`.show-repos/<name>-verify.png`). Read the screenshot before saying it renders.

If verify fails, fix the cause on main or in the show repo, then rerun. Never weaken a check to
pass it.

## Publish (outward-facing: needs Aaron's explicit go-ahead for this show)

Creating a GitHub repo, setting secrets, pushing and deploying are public acts. Ask once, in one
line: "Publish show `<name>` to https://<name>.beadfamous.com/ as a private repo loqwai/show-<name>?"
Only after a yes:

```bash
node scripts/show-repo/create.js <name> <same args> --publish [--visibility public]
```

`gh secret set` prompts for `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`; Aaron supplies
those. Then run `node scripts/show-repo/verify.js https://<name>.beadfamous.com/` and report its
numbers. The first show also needs the redirect Worker, deployed once:
`cd workers/shows-redirect && npx wrangler deploy`.

## Sync (pull main's fixes into a show)

```bash
node scripts/show-repo/create.js --sync --dir .show-repos/<name>      # or the show repo checkout
```

It merges `upstream/main`, resolves the expected conflicts and re-strips. It stops and names any
file that needs a human. Pushing the result (`git push origin show/<name>:main`) deploys it, which
is outward-facing again: ask first, unless Aaron already approved deploying this show.

## Show night

- Wall: `https://<name>.beadfamous.com/`, plus `?room=<secret>` for remote jamming.
- Phone: `https://<name>.beadfamous.com/vjpad.html?room=<secret>&shader=<path>`
- MIDI mapping: `https://<name>.beadfamous.com/midi.html`

The room name is the only lock on the wall. Never put it in the repo, `show.json`, a PR or the board.
