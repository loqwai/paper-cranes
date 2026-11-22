# cranes-local setup: rebuild the remote-VJ host on a fresh machine

`https://cranes-local.hypnodroid.com` serves the Vite dev server from the `live-tunnel`
worktree to a phone, behind Cloudflare Access. Agents then drive the page with
[remote inspect](remote-inspect.md). This page lists every piece of that setup that lives
outside git, and the one command that rebuilds it.

## One command

```bash
git clone git@github.com:loqwai/paper-cranes.git ~/Projects/paper-cranes
cd ~/Projects/paper-cranes
scripts/remote/setup-cranes-local.sh --check   # what is missing; changes nothing
scripts/remote/setup-cranes-local.sh           # converge
```

Run the script from any checkout that has it. Until this script reaches `main`, check out
`cranes-local-setup` (or whichever branch it has merged into) first. The script creates the `live-tunnel` worktree at
`~/Projects/paper-cranes-live` and runs everything else from there.

The script is idempotent. It skips every step that is already done, and it never stops or
restarts a running dev server or tunnel, so running it during a show is safe. `--check`
exits 1 when something is missing.

| Flag | Effect |
|---|---|
| `--check` | Report only. |
| `--tunnel soul` | Default. The hostname uses the shared `soul` tunnel. Its ingress is stored in Cloudflare, so there is no local config. |
| `--start-connector` | Soul mode: start the `soul` connector container when none is running. The connector token comes from `cloudflared tunnel token soul` and is passed by environment, not written to disk. |
| `--tunnel dedicated` | Use a separate named tunnel `cranes-local` with `~/.cloudflared/cranes-local.yml`. |
| `--route-dns` | Dedicated mode: repoint the hostname's CNAME from `soul` to `cranes-local`. |
| `--install-units` | Write and enable the systemd `--user` units `cranes-vite.service` and, in dedicated mode, `cranes-tunnel.service`. |
| `--quick` | Also build, run `vite preview` on 6978, and open a trycloudflare quick tunnel (read-only fallback). |

The verify step expects these results:

- `http://127.0.0.1:6977/` returns 200.
- `/__remote-inspect/token` returns the token file's contents to loopback.
- `https://cranes-local.hypnodroid.com/` returns a 302 to `*.cloudflareaccess.com`. A 502 behind Access means the tunnel is up but Vite is down. A 530 or 1033 error means no connector is running.
- `cranes-remote.js status` gets an answer once a phone has the page open.

## Which tunnel mode

- **soul (default)**: matches the setup as of 2026-11-22. One connector serves every
  `*.hypnodroid.com` dev host (mindmeld, draw-local, relay, and others), so it moves with the
  rest of soul. The `cranes-local` ingress entry stays in Cloudflare across the move.
  Its service is `http://host.docker.internal:6977`, which resolves on Docker Desktop. On
  native Linux with `--network host`, the connector needs
  `--add-host host.docker.internal:127.0.0.1`. `--start-connector` adds this flag when it
  is not on WSL.
- **dedicated**: use this when soul's connector is not on this machine. Run
  `cloudflared tunnel login` once, then
  `setup-cranes-local.sh --tunnel dedicated --route-dns --install-units`.

## Inventory: what lives outside git

| Piece | Where | Rebuilt by |
|---|---|---|
| Worktree | `~/Projects/paper-cranes-live`, branch `live-tunnel` (pushed to origin) | script (`git worktree add`) |
| Dev server | Vite, `127.0.0.1:6977`, `--strictPort --host 127.0.0.1` (never `0.0.0.0`: that exposes `/__save-shader`) | script (nohup or `cranes-vite.service`) |
| Read-only preview | `vite preview` on `127.0.0.1:6978` + quick tunnel with `--config /dev/null` | script `--quick` |
| Node | v25 via fnm (`.nvmrc`) | install fnm, then `fnm install 25` |
| Named tunnel | `soul`, id `6ac3efba-fde7-4757-93cf-f555c71e9630`, remote-managed (token mode) | Cloudflare holds it; connector via `--start-connector` |
| Ingress | soul tunnel config: `cranes-local.hypnodroid.com` -> `http://host.docker.internal:6977` | Cloudflare holds it |
| DNS | proxied CNAME `cranes-local` -> `6ac3efba-….cfargotunnel.com` | Cloudflare holds it (`--route-dns` for dedicated) |
| Access | wildcard app "Protect hypnodroid.com" (`*.hypnodroid.com`): allow @aaronherres.com / @hypnodroid.com emails, plus any valid service token | Cloudflare holds it; nothing per host |
| Short links | 2cb.pw, KV namespace `e239df04697f45d78631c29760c1a5b9` ("short-urls") | Cloudflare holds it; needs `wrangler login` |
| Remote-inspect token | `~/.config/paper-cranes/remote-inspect-token` | script (generated if missing) |

`~/.cloudflared/config.yml` on the old machine names the soul tunnel, but it is stale. The
soul connector does not read it. Do not copy it to a new machine.

## Secrets

Do not commit these files, paste them, or copy them into notes. Every one can be recovered
from Cloudflare or regenerated.

| Secret | Lives at | Recover |
|---|---|---|
| Cloudflare origin cert | `~/.cloudflared/cert.pem` | `cloudflared tunnel login` (choose hypnodroid.com) |
| soul connector token | Docker container env/args (`cloudflared` container) | `cloudflared tunnel token soul` (needs cert.pem), or dashboard → Zero Trust → Networks → Tunnels → soul |
| Dedicated tunnel credentials | `~/.cloudflared/<tunnel-id>.json` | `cloudflared tunnel token --cred-file ~/.cloudflared/<id>.json cranes-local` |
| Remote-inspect token | `~/.config/paper-cranes/remote-inspect-token` | regenerated by the script, or `node scripts/remote/cranes-remote.js token rotate`. Machine-local by design. Open tabs pick up the new token when they reload. |
| wrangler OAuth token | `~/.config/.wrangler/config/default.toml` | `npx wrangler login` |
| gh token | `~/.config/gh/hosts.yml` | `gh auth login` |
| Access session | browser cookie on the phone | sign in again with email |

## WSL-only details that change on native Linux

- The soul connector runs in Docker Desktop, where `host.docker.internal` means the WSL host.
  See "Which tunnel mode" above.
- The vault fallback path is `/mnt/d/Projects/life-control/kb/`. On Linux, use the soul MCP
  or the vault's new mount.
- Live sessions drive the Windows Chrome via Claude in Chrome. On Linux, use the native
  Chrome with the extension installed.
- systemd `--user` is off in this WSL distro, so units need `systemd=true` in
  `/etc/wsl.conf`. Native Linux has it. Run `sudo loginctl enable-linger $USER` to start the
  units at boot rather than at login.
