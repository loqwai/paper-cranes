---
name: vj-pw
description: "Alias for /vibej-pw. Same skill, same behavior — VJ a shader live at a party through the Playwright MCP browser, auto-mutating it every minute to match the track. Usage: `/vj-pw [N-iterations] [shader-path-or-name]`. `/vj-pw stop`, `/vj-pw tick`. Identical to `/vibej-pw`."
allowed-tools: Bash Read Write Edit Grep Glob CronCreate CronList CronDelete mcp__playwright__browser_tabs mcp__playwright__browser_navigate mcp__playwright__browser_evaluate mcp__playwright__browser_take_screenshot mcp__playwright__browser_wait_for mcp__playwright__browser_console_messages mcp__playwright__browser_snapshot mcp__playwright__browser_hover mcp__playwright__browser_close
---

# /vj-pw — alias for /vibej-pw

`/vj-pw` mirrors the legacy `/vj` → `/vibej` shorthand for the Playwright-driven variants. Same arguments, same state file (`.claude/vj-state.json`), same behavior.

**Follow the instructions in `.claude/skills/vibej-pw/SKILL.md` verbatim.** Substitute `/vj-pw` for `/vibej-pw` in any examples; both names route here. When CronCreate schedules the recurring tick, it can use either `/vj-pw tick` or `/vibej-pw tick` — both work.

## The four VJ skills

| Skill | Browser MCP | Audio source |
|---|---|---|
| `/vibej`, `/vj` | `chrome-devtools` (the user's Chrome) | Spotify tab audio, hardcoded |
| `/vibej2` | `chrome-devtools` | parameterized — `mic` (default) / `spotify` / `tab` |
| `/vibej-pw`, `/vj-pw` | `playwright` (its own browser) | Spotify tab audio, hardcoded |
| `/vibej2-pw` | `playwright` | parameterized — `mic` (default) / `spotify` / `tab` |

Pick `-pw` when the `chrome-devtools` MCP isn't connected, or when you want the jam page in an isolated browser instance rather than the user's everyday Chrome. Pick a `2` variant unless you specifically want Spotify track names driving the palette — mic mode is the sturdier default for long sessions.

All four share one journal set (`journals/<shader-name>-cool-moments.md`) and one state-file format; only the browser fields differ (`jamPageId` vs `jamTabIndex`, plus a `browser` marker). Don't run two of them at once against the same shader — check `.claude/vj-state.json` and `CronList` first.

For the full skill body — philosophy, arguments, per-iteration loop, journal protocol, Playwright pitfalls — read `.claude/skills/vibej-pw/SKILL.md`.
