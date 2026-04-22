---
name: remap
description: "Reset the MIDI controller mapping for the Paper Cranes jam/edit page. Clears `localStorage['cranes-midi-profiles']` and reloads the tab so the next CC twist auto-assigns afresh. Usage: `/remap` (clears all profiles) or `/remap <device-name>` (clears one)."
allowed-tools: Bash mcp__claude-in-chrome__tabs_context_mcp mcp__claude-in-chrome__javascript_tool
---

# /remap — Reset MIDI Mapping

Clears the MIDI CC → knob mappings stored in `localStorage['cranes-midi-profiles']` on the jam/edit page, then reloads so the auto-assign logic starts from scratch. See [docs/midi-mapping.md](../../docs/midi-mapping.md) for what's being reset.

## Context

Arguments:
!`echo "$ARGUMENTS"`

## Steps

### 1. Find a jam or edit tab

Call `tabs_context_mcp` and pick the tab whose URL contains `jam.html` or `edit.html`. If none, tell the user to open one.

### 2. Inspect current profiles first (so the user knows what's being cleared)

```javascript
(() => {
  const raw = localStorage.getItem('cranes-midi-profiles');
  if (!raw) return { hadData: false };
  const data = JSON.parse(raw);
  const profiles = data.profiles || {};
  return {
    hadData: true,
    devices: Object.keys(profiles),
    mappingCounts: Object.fromEntries(
      Object.entries(profiles).map(([name, p]) => [name, Object.keys(p.mappings || {}).length])
    )
  };
})()
```

### 3. Clear

**No args → clear all:**
```javascript
localStorage.removeItem('cranes-midi-profiles')
```

**`<device-name>` arg → clear just that device:**
```javascript
(() => {
  const raw = localStorage.getItem('cranes-midi-profiles');
  if (!raw) return 'no profiles';
  const data = JSON.parse(raw);
  const name = '<device-name>';
  if (!data.profiles?.[name]) return 'no such device: ' + name;
  delete data.profiles[name];
  localStorage.setItem('cranes-midi-profiles', JSON.stringify(data));
  return 'cleared ' + name;
})()
```

### 4. Reload the tab so `createMidiMapper()` re-reads localStorage

```javascript
location.reload()
```

### 5. Confirm to the user

`**MIDI mapping reset** — cleared N profiles (<device names>). Reload done. Next CC twist will auto-assign from knob_1.`

## Notes

- The profile store is per-origin localStorage. If the user has both `localhost:$PORT` and a deployed domain open, only the tab you ran this on is affected.
- This does NOT touch the MIDI device itself or any physical LED state — it only clears the browser's memory of which CC maps to which knob.
- If the user wants the mapping preserved across reloads but temporarily disabled, that's a different feature (not what this skill does).
