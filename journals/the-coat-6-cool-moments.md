# the-coat-6 — Cool Moments

One journal per shader. **Purpose: feed the next shader's design.** When somebody sits down to make v7, these entries are the brief — they say which audio/visual correspondences were worth rewarding and which ones were missed.

Not a changelog. Not a highlight reel. A list of *(audio-pattern → visual-response)* mappings with enough specificity that a future shader can be built to handle them deliberately.

---

## Template

```markdown
### iter N — *Track* — Artist

**Audio fingerprint:** precise ranges for the features that made the moment. e.g. `bass 0.65-0.75 + centroid < 0.15 + entropy < 0.1 + mids 0.80-0.90`.

**Shader did right:** which VJ blocks fired, how their gates happened to overlap. Be specific about *which three-way alignment* made the scene hang together.

**Shader missed:** what the music was doing that *should* have produced a visual response but didn't. Wrong threshold? No matching effect? An active effect that clashed?

**Design hypothesis:** one line. "v7 should have a dedicated X effect gated on audio-pattern Y."
```

---

## Entries

### iter 39 — *Odds & Ends* — Late Night Radio

**Audio fingerprint:** `bass 0.69 (bassZ +0.58) + mids 0.85 + treble 0.19 (trebZ -0.72) + centroid 0.10 + entropy 0.07 + roughness 0.04`. Warm instrumental, almost no high-frequency content, slow pulsing bass. Very rare corner of feature-space.

**Shader did right:** Mercury flow (gated `bass > 0.25 AND centroid < 0.6`) + ground quake (gated `bass > 0.3 AND centroid < 0.5`) + aurora veils (gated `centroid < 0.35`, max intensity at `< 0.10`) + nebula fog pulse (on `bassZScore > 0`) + black hole (on `bassZ > 0.3`) **all fired simultaneously**. The scene read as a coherent *place* — liquid-chrome figure pouring while the ground rippled and green-teal curtains lit the sky — because five effects with different gating schemes happened to overlap at the same audio corner.

**Shader missed:** Nothing was keyed off `mids=0.85` specifically. A warm-instrumental track like this has almost no bass-kick *transients* — just a steady low pump + dominant mids. The current shader treats "dominant mids" as mild hue drift. It missed that this was the track's *identity* — a visual response specifically for *mid-dominant warmth* (not treble, not bass-transient) would have been distinctive.

**Design hypothesis:** v7 should have **at least one dedicated effect keyed to `mids > 0.7 AND centroid < 0.3 AND entropy < 0.2`** — the "warm dark instrumental" corner. Something that makes mid-energy *feel warm* rather than just nudging a hue offset. Candidate: a slow-breathing amber inner glow radiating *from* the silhouette outward, like the character is the warm heat source. Separate from the bass ring system (which fires on transients, not sustained levels).

**Secondary hypothesis:** The three-way alignment (mercury + quake + aurora) was an accident — they happen to share a centroid-band. v7 could *deliberately* build a gating DSL where effects declare the *region* of feature-space they belong to, making alignments intentional rather than emergent.

---
