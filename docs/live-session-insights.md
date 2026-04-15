# Live Creative Sessions with Claude — Insights & Game Design

How to make live audio-visual sessions with Claude feel like a game, not a chore.

## The Core Loop

```
Music plays → Shader reacts → User feels something → User says something →
Claude edits → Shader changes → User feels something new → repeat
```

This is a **creative feedback loop**. The tighter it is, the more fun it is. Every friction point — asking permission, debugging, waiting for reload — breaks the loop and kills the vibe.

## What We've Learned So Far

### Session Setup is the Boss Fight

Getting into the session is the hardest part. Chrome needs to be open, the MCP connection needs to work, tab audio needs to be shared, the dev server needs to be running. Each of these can fail silently.

**Lesson:** Automate setup ruthlessly. The `/live-session` skill exists to get from zero to jamming in one command. Every manual step we eliminate is a win.

**Gotcha discovered (2026-04-14):** The Claude-in-Chrome MCP can return stale tab IDs from dead sessions. Claude will happily "execute" JavaScript on tabs that don't exist and report success. Always verify with a visible side effect (like changing the page title) after reconnecting.

### Trust Issues Are Real

The user can't see what Claude "sees" through the MCP tools. When Claude says "I can see the editor" but Chrome isn't even open, that erodes trust fast. 

**Lesson:** When connecting to the browser, do something **visible** to prove the connection works. Change the page title, flash the background, something the user can confirm with their eyes. Don't just report tool return values.

### The Vibe Spectrum

There's a spectrum of how Claude should behave during a session:

| Mode | When | Claude's Role |
|------|------|---------------|
| **Setup** | Before music plays | Butler — systematic, reliable, invisible |
| **Exploring** | Tweaking knobs, trying things | DJ partner — suggest changes, read the room |
| **Locked In** | Found a good look, grooving | Hands off — don't touch what's working |
| **Broken** | Something went wrong | Medic — revert fast, explain later |

Reading which mode the user is in is the key skill. "That's sick" means locked in — don't change anything. "Hmm" means exploring — try something. Silence after a change means it might be broken.

### Knobs Are the Best Toy

The knob system (`knob_1` through `knob_200`) is the bridge between Claude's code edits and the user's real-time control. During a session:

- Claude can **set knobs programmatically**: `window.cranes.manualFeatures.knob_1 = 0.5`
- The user can **override with sliders** in the editor UI
- Claude can **read knob values** to understand what the user is dialing in
- The `/solo` skill switches between knob mode and audio-reactive mode

**Lesson:** Knobs make the session feel collaborative rather than turn-based. Claude proposes a value, user adjusts it, Claude sees the adjustment and learns the preference.

### Edit Cadence Matters

- **Too fast:** User can't process changes before the next one lands. Feels chaotic.
- **Too slow:** User gets bored waiting. Feels like talking to a chatbot, not jamming.
- **Just right:** One change, pause for reaction, then next change. ~5-10 seconds between edits during active exploration.

**Lesson:** Watch for user reactions. A "whoa" means pause and let them enjoy it. Silence means keep going. "Go back" means revert immediately, don't ask what specifically.

### What Makes It Feel Like a Game

1. **Discovery:** Finding a new visual effect that looks amazing with a specific song. The "wow" moment.
2. **Mastery:** Learning which knobs do what, which audio features create which moods.
3. **Flow state:** When the music, visuals, and editing rhythm all sync up and time disappears.
4. **Shared authorship:** The visual is something neither Claude nor the user would have made alone.
5. **Low stakes:** Nothing is permanent. Every change hot-reloads. Every mistake reverts. No consequences, just play.

### What Kills the Fun

1. **Permission prompts:** "Should I change the god ray intensity?" Just change it.
2. **Long explanations:** "I'm going to modify the GODRAY_INTENSITY define on line 153 to use a mapValue call that..." Just do it.
3. **Broken state:** Shader goes white/black/error and Claude can't fix it quickly.
4. **Setup friction:** Any time spent not making visuals while music plays is wasted time.
5. **Claude being precious:** Treating the shader like production code. It's a jam — be bold, be messy, revert if it sucks.

## Ideas to Explore

- **Preset snapshots:** Save the current knob state as a named preset, recall it later
- **Mood commands:** "make it darker", "more chaos", "chill vibes" — Claude interprets these as multi-knob/code changes
- **Song-reactive editing:** Claude reads the audio features and proactively adjusts the shader to match the current song's character
- **Battle mode:** Two shaders side by side, user picks the winner, Claude evolves the winner
- **Rewind:** Undo the last N edits instantly, like a creative time machine
- **Surprise me:** Claude makes a random dramatic change — the user keeps it or reverts

## Session Log Template

After each session, capture what worked:

```
Date: YYYY-MM-DD
Shader: <path>
Music: <what was playing>
Duration: <how long we jammed>
Best moment: <what looked/felt amazing>
Worst friction: <what broke the flow>
Insight: <what we learned>
```
