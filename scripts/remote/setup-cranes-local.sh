#!/usr/bin/env bash
# setup-cranes-local.sh: rebuild the remote-VJ setup (cranes-local.hypnodroid.com -> Vite dev
# server on 127.0.0.1:6977, remote-inspect token, optional read-only quick tunnel) on a fresh
# Linux box. Idempotent: every step checks first and skips what is already in place. It never
# stops or restarts a running dev server or tunnel. See docs/cranes-local-setup.md.
#
#   scripts/remote/setup-cranes-local.sh --check            report only, change nothing (exit 1 if anything is missing)
#   scripts/remote/setup-cranes-local.sh                    converge (soul-connector mode)
#   scripts/remote/setup-cranes-local.sh --tunnel dedicated --route-dns
#                                                           own named tunnel "cranes-local" with a local config
#
# Flags:
#   --check              report only
#   --tunnel soul        (default) the hostname rides the shared "soul" tunnel, whose ingress is
#                        managed in the Cloudflare dashboard/API (token mode, no local config)
#   --tunnel dedicated   a separate named tunnel with ~/.cloudflared/cranes-local.yml
#   --route-dns          dedicated mode: point the hostname's CNAME at the dedicated tunnel
#                        (overwrites the CNAME to the soul tunnel)
#   --start-connector    soul mode: start the soul connector container if none is running
#   --install-units      write and enable systemd --user units (cranes-vite, cranes-tunnel)
#   --quick              also build + `vite preview` on 6978 and a trycloudflare quick tunnel
#
# Env overrides: CRANES_REPO, CRANES_LIVE, CRANES_BRANCH, CRANES_HOST, CRANES_PORT,
# CRANES_LOGDIR, CRANES_TUNNEL_NAME, CRANES_REMOTE_TOKEN_FILE.

set -uo pipefail

MODE=apply TUNNEL=soul ROUTE_DNS=0 START_CONNECTOR=0 INSTALL_UNITS=0 QUICK=0
while [ $# -gt 0 ]; do
  case "$1" in
    --check) MODE=check ;;
    --tunnel) TUNNEL="${2:?--tunnel needs soul|dedicated}"; shift ;;
    --tunnel=*) TUNNEL="${1#*=}" ;;
    --route-dns) ROUTE_DNS=1 ;;
    --start-connector) START_CONNECTOR=1 ;;
    --install-units) INSTALL_UNITS=1 ;;
    --quick) QUICK=1 ;;
    -h|--help) sed -n '2,26p' "$0"; exit 0 ;;
    *) echo "unknown flag: $1" >&2; exit 2 ;;
  esac
  shift
done
case "$TUNNEL" in soul|dedicated) ;; *) echo "--tunnel must be soul or dedicated" >&2; exit 2 ;; esac

REPO_URL=git@github.com:loqwai/paper-cranes.git
REPO="${CRANES_REPO:-$HOME/Projects/paper-cranes}"
LIVE="${CRANES_LIVE:-$HOME/Projects/paper-cranes-live}"
BRANCH="${CRANES_BRANCH:-live-tunnel}"
HOST="${CRANES_HOST:-cranes-local.hypnodroid.com}"
PORT="${CRANES_PORT:-6977}"
QPORT=6978
LOGDIR="${CRANES_LOGDIR:-$HOME/.local/state/paper-cranes}"
TOKEN_FILE="${CRANES_REMOTE_TOKEN_FILE:-$HOME/.config/paper-cranes/remote-inspect-token}"
CF_DIR="$HOME/.cloudflared"
DEDICATED_NAME="${CRANES_TUNNEL_NAME:-cranes-local}"
DEDICATED_CFG="$CF_DIR/$DEDICATED_NAME.yml"
SOUL_TUNNEL=soul
KV_NS=e239df04697f45d78631c29760c1a5b9   # 2cb.pw short links ("short-urls")
UNIT_DIR="$HOME/.config/systemd/user"
IS_WSL=0; grep -qi microsoft /proc/version 2>/dev/null && IS_WSL=1

MISSING=0
ok()   { printf '  \033[32mok\033[0m    %s\n' "$*"; }
miss() { printf '  \033[31mMISS\033[0m  %s\n' "$*"; MISSING=$((MISSING + 1)); }
warn() { printf '  \033[33mwarn\033[0m  %s\n' "$*"; }
info() { printf '  info  %s\n' "$*"; }
did()  { printf '  \033[36mdid\033[0m   %s\n' "$*"; }
step() { printf '\n== %s\n' "$*"; }
has()  { command -v "$1" >/dev/null 2>&1; }
# In --check mode, say what would happen and count it as missing; otherwise run it.
act() {
  local what="$1"; shift
  if [ "$MODE" = check ]; then miss "$what (would run: $*)"; return 1; fi
  if "$@"; then did "$what"; else miss "$what FAILED: $*"; return 1; fi
}
listening() { ss -ltnH "sport = :$1" 2>/dev/null | grep -q .; }
listen_addr() { ss -ltnH "sport = :$1" 2>/dev/null | awk '{print $4}' | head -1; }
listen_pid() { ss -ltnpH "sport = :$1" 2>/dev/null | grep -o 'pid=[0-9]*' | head -1 | cut -d= -f2; }

echo "cranes-local setup ($MODE, tunnel=$TUNNEL) host=$HOST port=$PORT live=$LIVE"

# ---------------------------------------------------------------------------------------------
step "prerequisites"
for bin in git curl ss; do has "$bin" && ok "$bin" || miss "$bin not installed"; done
want_node=25
[ -f "$LIVE/.nvmrc" ] && want_node="$(tr -dc '0-9.' < "$LIVE/.nvmrc" | cut -d. -f1)"
if has node; then
  have_node="$(node -v | tr -d v | cut -d. -f1)"
  [ "$have_node" -ge "$want_node" ] && ok "node $(node -v) ($(readlink -f "$(command -v node)"))" \
    || miss "node $(node -v) < v$want_node (.nvmrc). Install: curl -fsSL https://fnm.vercel.app/install | bash && fnm install $want_node"
else
  miss "node missing. Install fnm, then: fnm install $want_node && fnm default $want_node"
fi
has npm && ok "npm $(npm -v)" || miss "npm missing (comes with node)"
if has cloudflared; then ok "$(cloudflared --version 2>&1 | head -1)"
else miss "cloudflared missing: https://pkg.cloudflare.com (apt/pacman: cloudflared)"; fi
if has gh; then
  gh auth status >/dev/null 2>&1 && ok "gh logged in" || warn "gh not logged in: gh auth login (needed for PRs, not for the tunnel)"
else warn "gh missing (needed for PRs, not for the tunnel)"; fi
WRANGLER=""
if has wrangler; then WRANGLER=wrangler; elif has npx; then WRANGLER="npx -y wrangler@4"; fi
if [ -n "$WRANGLER" ] && $WRANGLER whoami 2>/dev/null | grep -qiE 'logged in|associated with'; then
  ok "wrangler logged in (OAuth token in ~/.config/.wrangler/config/default.toml)"
else
  warn "wrangler not logged in: npx wrangler login (needed only for 2cb.pw short links)"
fi
if [ "$IS_WSL" = 1 ]; then
  info "WSL detected: vault fallback /mnt/d/Projects/life-control/kb, Chrome is the Windows one, soul connector runs in Docker Desktop"
fi
if [ "$MISSING" -gt 0 ] && [ "$MODE" = apply ]; then
  echo; echo "install the missing prerequisites above, then rerun"; exit 1
fi

# ---------------------------------------------------------------------------------------------
step "checkout + worktree"
if git -C "$REPO" rev-parse --git-dir >/dev/null 2>&1; then ok "repo $REPO"
else act "clone repo to $REPO" git clone "$REPO_URL" "$REPO"; fi

if [ -d "$LIVE" ] && git -C "$LIVE" rev-parse --git-dir >/dev/null 2>&1; then
  cur="$(git -C "$LIVE" branch --show-current)"
  [ "$cur" = "$BRANCH" ] && ok "worktree $LIVE on $BRANCH @ $(git -C "$LIVE" rev-parse --short HEAD)" \
    || warn "worktree $LIVE is on '$cur', expected $BRANCH"
  up="$(git -C "$LIVE" rev-parse --short "origin/$BRANCH" 2>/dev/null || echo '?')"
  [ "$up" = "$(git -C "$LIVE" rev-parse --short HEAD)" ] || info "origin/$BRANCH is $up (not pulled automatically: pulling into the live tree can reload the phone)"
  [ -z "$(git -C "$LIVE" status --porcelain --untracked-files=no)" ] || warn "uncommitted changes in $LIVE: push them before moving machines"
elif git -C "$REPO" rev-parse --git-dir >/dev/null 2>&1 || [ "$MODE" = check ]; then
  add_worktree() {
    git -C "$REPO" fetch origin "$BRANCH" || return 1
    if git -C "$REPO" show-ref --verify --quiet "refs/heads/$BRANCH"; then
      git -C "$REPO" worktree add "$LIVE" "$BRANCH"
    else
      git -C "$REPO" worktree add --track -b "$BRANCH" "$LIVE" "origin/$BRANCH"
    fi
  }
  act "create worktree $LIVE ($BRANCH)" add_worktree
fi

# ---------------------------------------------------------------------------------------------
step "dependencies"
if [ -x "$LIVE/node_modules/.bin/vite" ]; then ok "node_modules present"
else act "npm ci in $LIVE" bash -c "cd '$LIVE' && npm ci"; fi

# ---------------------------------------------------------------------------------------------
step "remote-inspect token (secret; never commit or paste it)"
if [ -s "$TOKEN_FILE" ]; then
  mode="$(stat -c %a "$TOKEN_FILE")"
  [ "$mode" = 600 ] && ok "$TOKEN_FILE (mode 600)" || warn "$TOKEN_FILE has mode $mode; fix: chmod 600 '$TOKEN_FILE'"
else
  act "generate $TOKEN_FILE" bash -c "cd '$LIVE' && node -e \"import('./scripts/remote/token.js').then(m => m.readInspectToken())\""
fi

# ---------------------------------------------------------------------------------------------
step "dev server 127.0.0.1:$PORT"
mkdir_logs() { mkdir -p "$LOGDIR"; }
start_vite() {
  mkdir_logs && cd "$LIVE" && PORT="$PORT" nohup ./node_modules/.bin/vite --port "$PORT" --strictPort --host 127.0.0.1 \
    >> "$LOGDIR/cranes-dev.log" 2>&1 < /dev/null & disown
  for _ in $(seq 1 30); do listening "$PORT" && return 0; sleep 0.5; done; return 1
}
if listening "$PORT"; then
  pid="$(listen_pid "$PORT")"; addr="$(listen_addr "$PORT")"
  cwd="$( [ -n "$pid" ] && readlink "/proc/$pid/cwd" 2>/dev/null || echo '?')"
  ok "listening on $addr (pid ${pid:-?}, cwd $cwd); left running"
  case "$addr" in 127.0.0.1:*|\[::1\]:*) ;; *) warn "bound to $addr: exposes /__save-shader beyond loopback; restart it with --host 127.0.0.1 when nobody is on it" ;; esac
  [ "$cwd" = "$LIVE" ] || [ "$cwd" = '?' ] || warn "port $PORT is served from $cwd, not $LIVE"
elif [ "$INSTALL_UNITS" = 0 ]; then
  act "start vite on 127.0.0.1:$PORT (log $LOGDIR/cranes-dev.log)" start_vite
else
  info "not running; cranes-vite.service will start it (see units below)"
fi

# ---------------------------------------------------------------------------------------------
step "tunnel ($TUNNEL)"
CERT="$CF_DIR/cert.pem"
if [ -s "$CERT" ]; then ok "cloudflared origin cert $CERT (secret)"
elif [ "$TUNNEL" = dedicated ] || [ "$START_CONNECTOR" = 1 ]; then miss "no $CERT: run cloudflared tunnel login (pick hypnodroid.com)"
else info "no $CERT (only needed to create tunnels or fetch tokens: cloudflared tunnel login)"; fi

DOCKER=""
has docker && DOCKER=docker
[ "$IS_WSL" = 1 ] && has docker.exe && DOCKER=docker.exe
soul_running() {
  [ -n "$DOCKER" ] && $DOCKER ps --filter name='^cloudflared$' --format '{{.Status}}' 2>/dev/null | grep -q '^Up' && return 0
  pgrep -af 'cloudflared.*tunnel.*run' | grep -vE -- "--config $DEDICATED_CFG|--url " | grep -q .
}

if [ "$TUNNEL" = soul ]; then
  info "route lives in the soul tunnel's remote config (6ac3efba-fde7-4757-93cf-f555c71e9630, ingress $HOST -> http://host.docker.internal:$PORT); nothing local to write"
  if soul_running; then ok "soul connector running (${DOCKER:-process}: container 'cloudflared', token mode)"
  elif [ "$START_CONNECTOR" = 1 ]; then
    start_soul() {
      has docker || { echo "docker needed"; return 1; }
      local add_host=()
      # Native Linux + host network: make the ingress's host.docker.internal mean this box.
      [ "$IS_WSL" = 0 ] && add_host=(--add-host host.docker.internal:127.0.0.1)
      TUNNEL_TOKEN="$(cloudflared tunnel token "$SOUL_TUNNEL")" || return 1
      export TUNNEL_TOKEN
      docker run -d --name cloudflared --restart unless-stopped --network host "${add_host[@]}" \
        -e TUNNEL_TOKEN cloudflare/cloudflared:latest tunnel --no-autoupdate run >/dev/null
    }
    act "start soul connector container (token fetched with cloudflared tunnel token soul, passed by env)" start_soul
  else
    miss "no soul connector running. Start it: scripts/remote/setup-cranes-local.sh --start-connector (or use --tunnel dedicated)"
  fi
else
  TID=""
  [ -s "$CERT" ] && TID="$(cloudflared tunnel list --name "$DEDICATED_NAME" --output json 2>/dev/null \
    | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const t=JSON.parse(s).find(t=>!t.deleted_at);process.stdout.write(t?t.id:"")}catch{}})')"
  if [ -n "$TID" ]; then ok "tunnel $DEDICATED_NAME exists ($TID)"
  elif [ -s "$CERT" ]; then
    act "create tunnel $DEDICATED_NAME" cloudflared tunnel create "$DEDICATED_NAME" && \
      TID="$(cloudflared tunnel list --name "$DEDICATED_NAME" --output json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(JSON.parse(s)[0]?.id||""))')"
  fi
  CREDS="$CF_DIR/${TID:-<tunnel-id>}.json"
  if [ -n "$TID" ] && [ -s "$CREDS" ]; then ok "credentials $CREDS (secret)"
  elif [ -n "$TID" ]; then act "re-fetch credentials to $CREDS" cloudflared tunnel token --cred-file "$CREDS" "$DEDICATED_NAME"
  fi
  CFG="tunnel: ${TID:-<tunnel-id>}
credentials-file: $CREDS
ingress:
  - hostname: $HOST
    service: http://127.0.0.1:$PORT
  - service: http_status:404"
  if [ -f "$DEDICATED_CFG" ] && [ "$(cat "$DEDICATED_CFG")" = "$CFG" ]; then ok "config $DEDICATED_CFG"
  elif [ -n "$TID" ]; then act "write $DEDICATED_CFG" bash -c "umask 077; printf '%s\n' \"\$1\" > '$DEDICATED_CFG'" _ "$CFG"
  fi
  if [ "$ROUTE_DNS" = 1 ] && [ -n "$TID" ]; then
    act "route DNS $HOST -> $DEDICATED_NAME (overwrites the soul CNAME)" cloudflared tunnel route dns --overwrite-dns "$DEDICATED_NAME" "$HOST"
  else
    info "DNS not touched; add --route-dns to point $HOST at $DEDICATED_NAME"
  fi
  start_tunnel() {
    mkdir_logs && nohup cloudflared --no-autoupdate --config "$DEDICATED_CFG" tunnel run \
      >> "$LOGDIR/cranes-tunnel.log" 2>&1 < /dev/null & disown
  }
  if pgrep -f -- "--config $DEDICATED_CFG" >/dev/null; then ok "dedicated cloudflared running"
  elif [ "$INSTALL_UNITS" = 0 ] && [ -n "$TID" ]; then act "start cloudflared (log $LOGDIR/cranes-tunnel.log)" start_tunnel
  fi
fi

# ---------------------------------------------------------------------------------------------
if [ "$INSTALL_UNITS" = 1 ]; then
  step "systemd --user units"
  NODE_DIR="$(dirname "$(readlink -f "$(command -v node)")")"   # stable path, not an fnm multishell
  VITE_UNIT="[Unit]
Description=paper-cranes Vite dev server for $HOST (127.0.0.1:$PORT)

[Service]
WorkingDirectory=$LIVE
Environment=PATH=$NODE_DIR:/usr/local/bin:/usr/bin:/bin
Environment=PORT=$PORT
ExecStart=$LIVE/node_modules/.bin/vite --port $PORT --strictPort --host 127.0.0.1
Restart=on-failure

[Install]
WantedBy=default.target"
  TUN_UNIT="[Unit]
Description=cloudflared tunnel $DEDICATED_NAME for $HOST
After=network-online.target

[Service]
ExecStart=$(command -v cloudflared) --no-autoupdate --config $DEDICATED_CFG tunnel run
Restart=on-failure

[Install]
WantedBy=default.target"
  if ! systemctl --user show-environment >/dev/null 2>&1; then
    miss "systemd --user not available (WSL: set systemd=true in /etc/wsl.conf). Skipping units."
  else
    write_unit() { mkdir -p "$UNIT_DIR" && printf '%s\n' "$2" > "$UNIT_DIR/$1" && systemctl --user daemon-reload && systemctl --user enable "$1"; }
    [ "$(cat "$UNIT_DIR/cranes-vite.service" 2>/dev/null)" = "$VITE_UNIT" ] && ok "cranes-vite.service" \
      || act "write + enable cranes-vite.service" write_unit cranes-vite.service "$VITE_UNIT"
    if listening "$PORT"; then info "port $PORT busy: cranes-vite.service enabled but not started (starts next login/boot)"
    else act "start cranes-vite.service" systemctl --user start cranes-vite.service; fi
    if [ "$TUNNEL" = dedicated ]; then
      [ "$(cat "$UNIT_DIR/cranes-tunnel.service" 2>/dev/null)" = "$TUN_UNIT" ] && ok "cranes-tunnel.service" \
        || act "write + enable cranes-tunnel.service" write_unit cranes-tunnel.service "$TUN_UNIT"
      pgrep -f -- "--config $DEDICATED_CFG" >/dev/null || act "start cranes-tunnel.service" systemctl --user start cranes-tunnel.service
    fi
    loginctl show-user "$USER" -p Linger 2>/dev/null | grep -q yes || info "units start at login; to start at boot: sudo loginctl enable-linger $USER"
  fi
fi

# ---------------------------------------------------------------------------------------------
if [ "$QUICK" = 1 ]; then
  step "read-only quick tunnel (vite preview :$QPORT)"
  start_preview() {
    mkdir_logs && cd "$LIVE" && npx vite build >> "$LOGDIR/cranes-build.log" 2>&1 && \
      nohup npx vite preview --port "$QPORT" --strictPort --host 127.0.0.1 >> "$LOGDIR/cranes-preview.log" 2>&1 < /dev/null & disown
  }
  # --config /dev/null: never let a quick tunnel pick up ~/.cloudflared/config.yml (soul credentials).
  start_quick() {
    mkdir_logs && nohup cloudflared --config /dev/null tunnel --no-autoupdate --url "http://127.0.0.1:$QPORT" \
      > "$LOGDIR/cranes-quicktunnel.log" 2>&1 < /dev/null & disown; sleep 6
  }
  listening "$QPORT" && ok "preview on $(listen_addr "$QPORT")" || act "build + start vite preview" start_preview
  if pgrep -f "tunnel --no-autoupdate --url http://127.0.0.1:$QPORT" >/dev/null; then ok "quick tunnel running"
  else act "start quick tunnel" start_quick; fi
  url="$(grep -ho 'https://[a-z0-9-]*\.trycloudflare\.com' "$LOGDIR/cranes-quicktunnel.log" 2>/dev/null | tail -1)"
  [ -n "$url" ] && info "quick tunnel URL: $url (changes on every restart)"
fi

# ---------------------------------------------------------------------------------------------
step "2cb.pw short links"
if [ -n "$WRANGLER" ] && v="$(timeout 40 $WRANGLER kv key get clit-now --namespace-id "$KV_NS" --remote 2>/dev/null)" && [ -n "$v" ]; then
  ok "KV $KV_NS readable (clit-now -> ${v:0:80})"
else
  warn "cannot read KV $KV_NS (npx wrangler login, account 2f1143f469f762af4ef2336ec13f85b7)"
fi

# ---------------------------------------------------------------------------------------------
step "verify"
code="$(curl -s -o /dev/null -m 10 -w '%{http_code}' "http://127.0.0.1:$PORT/" || true)"
[ "$code" = 200 ] && ok "origin http://127.0.0.1:$PORT/ -> 200" || miss "origin http://127.0.0.1:$PORT/ -> ${code:-no answer}"
if [ -s "$TOKEN_FILE" ] && listening "$PORT"; then
  served="$(curl -s -m 5 "http://127.0.0.1:$PORT/__remote-inspect/token" | sha256sum | cut -c1-12)"
  [ "$served" = "$(tr -d '\n' < "$TOKEN_FILE" | sha256sum | cut -c1-12)" ] \
    && ok "/__remote-inspect/token serves the token file to loopback" \
    || warn "/__remote-inspect/token does not match $TOKEN_FILE (old dev server without remote-inspect?)"
fi
read -r code loc < <(curl -s -o /dev/null -m 15 -w '%{http_code} %{redirect_url}\n' "https://$HOST/" || echo "000 -")
if [ "$code" = 302 ] && [[ "$loc" == *cloudflareaccess.com* ]]; then ok "https://$HOST/ -> 302 to Access login"
else miss "https://$HOST/ -> $code $loc (expected 302 to *.cloudflareaccess.com; 502 behind Access = tunnel up, origin down; 530/1033 = no connector)"; fi
if listening "$PORT"; then
  if out="$(cd "$LIVE" && timeout 8 node scripts/remote/cranes-remote.js --port "$PORT" --timeout 4000 status 2>&1)"; then
    ok "cranes-remote status: a display answered"; printf '%s\n' "$out" | head -8 | sed 's/^/        /'
  else
    info "cranes-remote status: no display answered (open https://$HOST/?shader=clit-set/2&controller=clit-set&wavelet=true on the phone, then rerun)"
  fi
fi

echo
if [ "$MISSING" -eq 0 ]; then echo "all good"; exit 0; fi
echo "$MISSING item(s) missing$([ "$MODE" = check ] && echo '; rerun without --check to fix what can be fixed')"
exit 1
