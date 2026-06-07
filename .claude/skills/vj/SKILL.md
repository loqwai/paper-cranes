---
name: vj
description: "Legacy alias for /vibej. Same skill, same behavior — VJ a shader live at a party, auto-mutating it every minute to match the track. Usage: `/vj [N-iterations] [shader-path-or-name]`. `/vj stop`, `/vj tick`. Identical to `/vibej`."
allowed-tools: Bash Read Write Edit Grep Glob CronCreate CronList CronDelete mcp__chrome-devtools__list_pages mcp__chrome-devtools__new_page mcp__chrome-devtools__select_page mcp__chrome-devtools__navigate_page mcp__chrome-devtools__evaluate_script mcp__chrome-devtools__take_screenshot mcp__chrome-devtools__wait_for mcp__chrome-devtools__list_console_messages
---

# /vj — alias for /vibej

`/vj` is the legacy entry point for the VJ skill. It now lives under the name **vibej**, but `/vj` keeps working forever — same arguments, same state file (`.claude/vj-state.json`), same behavior.

**Follow the instructions in `.claude/skills/vibej/SKILL.md` verbatim.** Substitute `/vj` for `/vibej` in any examples; both names route here. When CronCreate schedules the recurring tick, it can use either `/vj tick` or `/vibej tick` — both work.

> Why two names? Renamed to **vibej** because "vj" is also a common shorthand for "video jockey" generally, while this skill is specifically the live shader auto-mutation loop for the jam page. The legacy `/vj` alias is preserved so muscle memory keeps working and existing journals / state files stay valid.

For the full skill body — philosophy, arguments, per-iteration loop, journal protocol, common pitfalls — read `.claude/skills/vibej/SKILL.md`.
