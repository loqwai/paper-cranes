# handstand/1 — Session Journal

ChromaDepth handstand portal. This `/vibej` run **evolves in effects from the the-coat series**,
one coat motif per tick, each adapted to keep the chromadepth read intact.

## Status
RUN ENDED (iter 20). Stopped the cron — the music settled back into the bright/entropy corner and ticks were no-opping (iter 16/17/19/20 all the same covered corner; iter 18 was the one new-corner win). Shader is feature-complete + healthy and ready to /fork. To resume: `/vibej redaphid/handstand/1` when a new set is playing.

### Final state — handstand/1 (chromadepth)
9 coat motifs ported (FUR FIBERS, SIGIL SWIRL, EMBER RISE, PRISM RIM, STEP RIPPLE, WARM HEARTH, HEART PULSE,
GROOVE BREATH, GHOST ECHO, GROUND QUAKE, SUB RING) + 6 refinements. Feature map covers every band. All
chromadepth-clean (0% white verified throughout). User flags all handled: bass-zoom amplitude (iter9),
no-white (hard rule), no-grey (iter10), grit-frequency (early). quietGate-floor learning generalized to all
bass/mid-gated effects (iter15/18).

## HARD RULE (user, this session)
**No white.** This is chromadepth (red=near, green=mid, violet=far). White has no hue → kills the 3D read.
- Figure effects feed `figLit`, then `figLit = min(figLit, 0.62)` before `chromadepth()`.
- Never add raw white to `col`. Far-field sparks ride the violet band (t≥0.85) so they recede.

## History of changes (coat ports)
- **iter 1** — three coat effects ported to the figure interior / far-field:
  - **FUR FIBERS** (the-coat headline) — double domain-warped `flow2` shaped into sharp ridges
    (`pow(abs(sin(...)),3)`), flowing through the body as light-strands. Gated by spectral CHAOS
    (entropy+roughness), warp rate driven by `spectralCentroidNormalized` (pitch-aware swirl, the coat trick).
    Feeds `figLit` only → red→green interior holds.
  - **SIGIL SWIRL** — radial spiral wave on the figure (`sin(angle*5 + r*14 - FLOW*1.4 + mids*3)`),
    band-limited to the body radius. Coat used full hue; here kept brightness-only (figLit) so chromadepth holds.
    Gated by mids + bassZScore.
  - **EMBER RISE** — 6 deterministic sparks rising in the lower far-field on the warm-low corner
    (mids-dominant + low centroid). Coat used amber; here recolored to the FAR violet band (t=0.88) so
    they recede behind the dancer. Masked outside the figure, lower half.

- **iter 1 (live flag)** — user: "grit outline effect should happen less frequently." Raised the RIM GRIT
  gate from `smoothstep(0.20,0.45,entropy)` to `smoothstep(0.55,0.80,entropy) * smoothstep(0.40,0.70,roughness)`
  — now needs BOTH high entropy and high roughness, so the fraying outline only fires on genuinely gnarly moments.

- **iter 2 (live flag — KEY LEARNING)** — user: "the water-like effect lifted from the coat texture
  washes out the inside of the handstand — colors become less vibrant, lowers the chromadepth." That was
  FUR FIBERS (+ SIGIL SWIRL) adding to `figLit`. **Root cause: in HSL, raising L past ~0.5 desaturates
  toward white.** Any additive-lightness effect on a saturated chromadepth figure bleaches it.
  **Fix (the general translation rule for porting coat glows to chromadepth):** express the effect as
  `figT -= amt` (pull toward red/near) + `figSat += amt` (MORE vibrant), with only a whisper of `figLit`.
  Result: fibers now read as vibrant near-red depth detail that DEEPENS the 3D pop instead of bleaching it.
  Verified 0% white with fibers active.

- **iter 3** — **PRISM RIM** ported. Coat cycled a full rainbow rim by uv-angle+time; on chromadepth
  a full rainbow rim is forbidden (a blue rim reads as FAR, contradicting "the edge pops forward").
  So the hue cycle is clamped to `fract(...) * 0.14` — the NEAR band only (red→orange→yellow). The edge
  shimmers prismatically while every hue still reads near. Gated by the bright corner (treble × centroid).
  Audio when added: treb 0.85, entropy 0.92, centroid 0.76, bass 0.06 — a bright airy passage, exactly
  the coat's intended prism-rim territory.

- **iter 4** — **STEP RIPPLE** ported. Coat radiated a horizontal beat-wave from the chest (1,2-step
  dance move). Recast here as vertical far-violet bands sweeping OUTWARD from the figure's centerline
  through the nebula — energy rippling away into space. Gated by the bright corner (treble × centroid ×
  energy) because the rotation kept landing in treble-dominant/no-bass passages (the bass-gated coat
  effects DRIP/QUAKE/HEART couldn't fire). Far band + outside-figure mask → recedes, chromadepth-safe.
  **Note for next session: this room's audio has been bass-starved (bass ~0.05) — the bass-gated coat
  ports won't get exercised until a bassy track plays.**

- **iter 5** — **WARM HEARTH** ported. Coat's mid-dominant signature: slow amber glow blooming OUTWARD
  from the figure on warm-dark-instrumental passages. Chromadepth adaptation: kept in the NEAR red-orange
  band (t≈0.05) so the halo reads as the figure's own warmth pushing toward the viewer — never white/blue.
  Outward falloff built from an 8-tap mask dilation (radii 0.05 + 0.10) masked to outside the silhouette,
  slow `sin(iTime*0.4)` breathe. Gated mids>centroid + low energy — DORMANT in the current treble passage;
  will bloom when a warm mid-heavy track plays. Picked this over another treble effect to avoid over-
  stacking the bright corner (already PRISM RIM + STEP RIPPLE + TREBLE SHIMMER there).

- **iter 9 (live flag — FIGURE ZOOM)** — user: "I need the zoom to have more amplitude with the bass."
  Cranked the FIGURE_ZOOM bass coefficients ~2× (swell 0.10→0.20, kick 0.20→0.40, hit 0.14→0.28, FFT
  bassZ 0.10→0.20) and widened the clamp ranges 1.0→1.5 so strong hits push further. Base 1.22 → ~0.45
  on a hard slam (was ~0.85). The figure now lunges much bigger toward the viewer on the kick.
- **iter 9** — **GROUND QUAKE** ported. Coat's amber floor-rumble recast as far-VIOLET elliptical rings
  expanding up from below the figure — deep-bass shockwave receding into the background. Gated bass ×
  low-centroid (sub territory), masked outside figure. Dormant on the current treble passage; fires on real low-end.

- **iter 10** — **SUB RING** ported (last distinct coat motif). Coat fired an expanding cone ring on
  bass but gated it to REAL drops so it didn't drown the figure — same discipline here: gated TIGHT on
  energyZ × bassZ (a genuine drop) so it does NOT stack with per-kick HEART PULSE / GROUND QUAKE / BASS
  BLOOM (the bass-stacking pitfall). One clean far-violet ring from the figure base on big moments only.
  **DRIP consciously SKIPPED:** its teardrop-from-chest overlaps HEART PULSE's pure-red core too directly,
  and a 4th bass-radial would over-saturate drops. Coat roadmap complete: 9 motifs ported.

## Cool moments
- **iter 18 — WARM-DARK corner finally arrived + got fixed (audio: mids 0.93, centroid 0.16, treble 0.11,
  energy 0.11, quietGate 0.00).** The music spent the whole run bass-light/bright; this was the FIRST
  mid-dominant warm-dark passage — exactly what WARM HEARTH / MID WARMTH / EMBER RISE were built for. But
  they were fully MUTED: quietGate read 0.00 (mids-heavy passages read mic-quiet, same under-read as the
  iter15 solo-bass case). Floored quietGate→0.45 on both warm effects; warm near-band response jumped to
  7.9% of frame, 0% white. **Confirmed design hypothesis: the mid-dominant warmth effects work — they just
  needed the quietGate floor that bass effects already had. Generalize: ANY non-treble-gated figure effect
  needs a quietGate floor, because the mic-derived quietGate only tracks broadband energy and under-reads
  spectrally-narrow (pure bass OR pure mids) passages.**

- **iter 6 — HEART PULSE landed (audio fingerprint: bass 0.65, bassZ 1.17, mids 0.80, centroid 0.11,
  entropy 0.12, energy 0.10 — deep warm-low corner).** Coat's chest-glow recast as a pure-red (t=0 =
  nearest) throb from the figure's core, confined to figMask. On the bass spike it measured 7.6% red
  pixels with 0% white — the dancer's center visibly punches forward. **Why it worked:** pure red is
  the strongest chromadepth pop, and gating on bassZScore (with a quietGate floor of 0.35, since the mic
  reads bassy passages as quiet) means it fires exactly on the hit. **Design hypothesis:** the figure
  CORE (not the rim) is the right place for the "near-most" red event — rim already does edge-pop, core
  does mass-pop; together they give two depth layers of red.

- **iter 7** — **GROOVE BREATH** ported. Coat's slow full-frame brightness breath on calm-groove
  passages. **Chromadepth refinement of the translation rule:** instead of ADDING brightness (washes),
  made it MULTIPLICATIVE: `col *= 1 + grooveGate*breath*0.10`. Multiplying scales existing colors up/down,
  preserving hue AND saturation exactly → mathematically zero white risk, unlike additive. Bell-curve
  energy gate (peaks ~0.45 groove pocket) × mids × not-during-surges. Added on a balanced mid-energy
  passage (bass 0.35, mids 0.41, energy 0.44). **New rule for full-frame breaths on chromadepth: multiply, don't add.**

- **iter 8** — **GHOST ECHO** ported. Coat raised feedback on bass spikes for a coat afterimage. Here
  it modulates the EXISTING feedback blend (`fbBlend = mix(0.12, 0.42, ghost)`) rather than adding a new
  overlay — so it doesn't over-stack the composition. **Free chromadepth win:** the feedback path already
  ages trails toward blue + dims them, so the lingering echo recedes into the far band as it fades — a
  ghost peeling off the dancer into the distance. Chose it over the 3 remaining bass-additive effects
  (GROUND QUAKE/SUB RING/DRIP) precisely because it reuses feedback instead of piling on a new layer.
  NOTE: did NOT add crystalline/diamond glitch for the high-entropy passage — coat history vetoed
  "crystalline facets" + "flannel diamonds" (user). Stayed away.

- **iter 10 (live flag — FIBER GREY, hardened)** — user: "that water effect can still make the inside of
  the handstand greyish — make sure this can't happen." The iter-2 fix still left a `figLit += strandM*0.04`
  whisper, and any lightness add toward mid-grey desaturates. **Bulletproof fix: removed the figLit term
  entirely from BOTH FUR FIBERS and SIGIL SWIRL.** They now ONLY pull figT toward red (depth) and ONLY
  ADD saturation (`figSat = clamp(figSat + amt, figSat, 1.0)` — floor at current, can't drop). With zero
  lightness contribution and saturation that can only rise, the interior is *mathematically incapable* of
  greying from these effects. Verified figure-center mean saturation = 0.935 (highly vibrant), grey 0.06%.

- **iter 11 (refinement, audio: entropy 0.95, treble 0.86, centroid 0.80, bass 0.02 — peak chaos corner)**
  — **CHAOS RECEDE.** Roadmap done, so this tick TUNED the existing far field instead of adding a motif.
  At extreme entropy the nebula filaments + PRISM RIM + STEP RIPPLE all max out and start competing with
  the figure. Fix: as entropy climbs (smoothstep 0.55→0.95) the far-field brightness cap drops 0.26→0.18,
  so the busier the nebula, the HARDER it recedes — sharpens the chromadepth read exactly when it's most
  threatened. Verified: corner (far field) mean brightness ~14% at entropy 0.95, figure stays dominant.
  **Design hypothesis:** "the chromadepth-correct response to MORE background activity is MORE recession,
  not matching brightness — push the busy field further back, don't let it climb forward."

- **iter 12 (refinement, audio: energy 0.29, quietGate 0.29, entropy 0.71, pitch 0.73 — breakdown,
  melodic)** — **MELODIC BREATH.** Noticed pitchClass swinging wide across ticks (0.09→0.91→0.36→0.73)
  = the music is melodic, but the shader only used pitch as a tiny palette tint. In breakdowns the figure
  had QUIET BREATH (a fixed sine swell) but nothing musical. Added a pitch→figT (depth) nudge gated to
  quiet passages: the body drifts a touch nearer/further with the melody note, ±0.03, clamped 0..0.45 so
  it stays in the near/mid band. Pure depth (hue) modulation → chromadepth-correct, no white. Quiet
  sections now feel like the dancer is breathing WITH the melody, not on a timer.

- **iter 13 (refinement, audio: energy 0.85, treble 0.79, centroid 0.67, bass 0.13 — bright sustained,
  bass-light)** — **ENERGY-LIFT.** Observed a gap: when the track is DRIVING (high energy) but bass-light,
  the figure went static because nearly all its motion (zoom/pop/heart/shake) is bass-gated. Added an
  energy term to TREBLE SHIMMER's `airy` gate (smoothstep 0.55→0.9 energy × 0.4) so the limbs crackle
  with the track's drive even without bass. **Gap identified for the feature-map: handstand had NO pure-
  energy-driven figure response — everything keyed off bass or treble-character. This fills it.**

- **iter 14 (refinement, measured)** — extended CHAOS RECEDE to trigger on high centroid too. Diagnostic
  showed the far field at ~25% brightness in bright-but-not-chaotic passages (centroid 0.75) because the
  field's PRISM/STEP glow was lifting it — entropy-only recede missed those. Now `max(entropy, centroid)`
  drives the recede and the cap floor dropped 0.18→0.16. Result (measured): bg 65→56, contrast 1.7×→2.1×.
  **Used a live pixel-diagnostic (figure vs background mean brightness + contrast ratio) to PICK the edit
  rather than guess — the right way to do refinement ticks when no new motif is needed.**

- **iter 15 (refinement, audio: bass 0.96 / bassZ 0.87 but treble/centroid/energy ~0, quietGate 0 —
  a deep SOLO-BASS intro, mix otherwise empty)** — caught a real gap: in solo-bass passages the
  mic-derived quietGate reads ~0 (it thinks it's silence), so effects that fully multiply by quietGate
  vanish — BASS BLOOM was muted exactly when a sub was slamming. Gave its `kick` a `max(quietGate, 0.4)`
  floor (matching FIGURE_ZOOM/HEART PULSE) + an FFT bassZ fallback. **Pattern worth remembering: quietGate
  under-reads on deep-bass-only intros through a mic; bass-reactive effects must floor it, not trust it.**

- **iter 16 (NO-OP)** — audio in the same bright/entropy corner (treble 0.71, entropy 0.79) that's already
  maximally covered (PRISM RIM, STEP RIPPLE, ENERGY-LIFT, FUR FIBERS, ENTROPY FRACTURE, CHAOS RECEDE).
  Health-checked instead of editing: compile OK, 0% white/grey, fig sat 0.95, contrast 2.46×. Chose NOT to
  edit — forcing a change here would violate "one MEANINGFUL move per tick." The build-out + refinement
  phases are done; shader is in a finished, forkable state. Further meaningful ticks need NEW music corners.

## Todo (coat effects still to port — see vj-state.json coatEffectsTodo)
- [ ] DRIP, GROUND QUAKE, STEP RIPPLE, WARM HEARTH, HEART PULSE, GHOST ECHO, PRISM RIM (band-clamped),
      GROOVE BREATH, SUB RING — each adapted to chromadepth (no white, correct depth band).

## Design hypotheses for v(next)
- The coat's effect library is mostly additive glows; on chromadepth they MUST be expressed as
  lightness-within-a-depth-band, never as white. The translation rule is: pick the hue (depth) first,
  then modulate lightness — exactly what `chromadepth(t, sat, lit)` enforces.
