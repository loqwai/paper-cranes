# iris/wavelet — Session Journal

Wavelet-driven iris variant. Requires `?wavelet=true&controller=wavelet-ease`.
Knob preset lives in the shader's own line-2 header URL.

## Status
Iter 11 — LIVE. **First `/vibej2` run: mic mode (laptop microphone, no Spotify).**
Now also `?remote=display` — LAN controller at `http://192.168.1.108:6969/list.html?remote=control`.
Cron `783f630f` firing per-minute, target 180. moveStyle: dramatic.
**Headline finding: `quietGate` is unusable on a quiet laptop mic — see iter3/iter4.**

## History of changes
- iter0 (2026-09-06): session start. **Ambient mic mode** via `/vibej2` (mic is v2's
  default — no `audio=` param, `index.js` `setupAudio()` falls through to the mic
  `AudioProcessor`). Loaded `iris/wavelet` with its header-preset knobs. 123 wavelet
  features confirmed flowing.
- iter1: **LIMBAL BASS BLOOM.** The limbal ring (`smoothstep(0.40, 0.56, irisR)`, line 345)
  was the single largest shape on screen and completely static — no audio term at all. On
  bass-dominant mic material that left the frame's biggest form dead. Added:
  `limbalBloom = clamp(waveletBeat*0.55 + waveletBassSpring*0.45, 0, 1) * quietGate`
  driving both an outward push (3.5% max) and a widening/softening (2.5%) of the band.
  Uses `waveletBassZScore` (via the existing `waveletBeat`) so it self-calibrates to any
  mic gain, and `quietGate` so room tone in the gaps doesn't wobble the ring.

- iter2: switched the jam page to `?remote=display` so a second machine can drive it via
  `list.html?remote=control` (both `src/remote/RemoteController.js` and `RemoteDisplay.js`
  already existed; vite was already bound to `0.0.0.0`). **The reload did NOT cost the mic
  capture** — worth knowing, mic mode is far cheaper to reload than tab-audio mode.
- iter3: **BASS-AWARE GATE (local).** Discovered the iter1 limbal bloom was dormant: it is
  multiplied by `quietGate`, which measured 0.45 → 0.00 → 0.19 across three reads while
  every wavelet band was healthy. Added `liveGate = max(quietGate, smoothstep(0.10, 0.35,
  waveletBassSpring))` per the `journals/1-cool-moments.md` recommendation.
- iter4: **LIVE_GATE PROMOTED GLOBAL — the big one.** Traced the root cause: `quietGate` is
  computed in `wavelet-ease.js:159` from **raw absolute** `features.energy` over a hardcoded
  `0.015..0.065` window, so it is **gain-dependent**. On a quiet laptop mic it sits at
  ~0 during real music (measured windowed avg **0.011**, max 0.247, while
  `waveletBassSpring` was **0.625** and `bassGate` computed to **1.0**).
  Because FOUR of the shader's "many-feature modulation" terms are multiplied by it —
  `RIPPLE_FREQ` spread (L163), `RING_REACH` (L164), `petalFocus` (L222), `skewStretch`
  (L223) — the entire fractal-complexity modulation system was **switched off on mic input**.
  Added `#define LIVE_GATE (max(quietGate, smoothstep(0.10, 0.35, waveletBassSpring)))`
  after the `quietGate` uniform and swapped all four sites plus the limbal bloom onto it.
  `quietGate` still wins when genuinely loud, so direct-in behaviour is unchanged.
  **Compile note:** first attempt failed GL validation (`'uniform' : syntax error`) because
  the inserted `#define` had no trailing newline and ran into the next `uniform`. Caught
  pre-save by `__vjValidate` — nothing broken was ever written to the live page.

- iter5: **COLOR_GATE — palette audit, 0 bare `quietGate` sites left.** The four remaining
  bare sites were all PALETTE terms: `MASTER_HUE` (L164), `SUB_LEAN` (L176), `CORE_HUE`
  (L185), `CORONA_HUE` (L186). On a quiet mic those collapse to fixed hues, so the iris went
  monochrome exactly when the music dropped. Colour wants a FLOOR rather than geometry's
  full swing — never fully dead, never wild on noise:
  `#define COLOR_GATE (0.35 + 0.65 * LIVE_GATE)`.
  Confirms the iter4 diagnosis was about the QUIET case specifically, not a broken gate:
  this tick the room was loud and `quietGate` read **0.928** (windowed avg 0.712), wide open.

- iter6: **BROADBAND WASH gate — third corner of the texture space.** `monsterBass` covers
  sub-heavy; `trebleShimmer` covers bright+chaotic+bass-light. Neither fires on a dense
  NOISY WASH. Measured: roughness 0.87 + entropy 0.954 + spread 0.903 + rolloff 0.983 all
  near max while **crest collapsed to 0.045 and skew to 0.071** — loud, broadband, zero
  transient peaks (noise sweep / cymbal wash / breakdown). Added:
  `washGate = smoothstep(0.55,0.85,spread) * smoothstep(0.55,0.85,spectralEntropySmooth)
   * smoothstep(0.35,0.08,spectralCrestSmooth) * LIVE_GATE`
  **LOW CREST is the discriminator** — a wash has energy everywhere and peaks nowhere, so
  the crest term is INVERTED. Wired to the `t` palette traversal (drift toward the corona
  end + radial spread), deliberately small: a drift, not a strobe.
  **Gotcha found:** `entropy_env` is defined as `1 - tonalStrength`, which read only 0.62
  while the true `spectralEntropySmooth` was 0.954 — the shader's "entropy" was understating
  how noisy the passage actually was. The new gate keys on `spectralEntropySmooth` directly.
  **Placement constraint:** `washGate` is declared at L438 but `structure` is built at L329,
  so the veil could not be wired into `structure` — went into `t` (L450+) instead, which is
  after the gate. Worth remembering when adding gates: declaration order limits wiring.

- iter7: **HARD KICK GLINT — reclaiming discarded headroom.** `wavelet_bassHit` is the
  sharpest trigger in the feature set and was used in exactly ONE place: the L305 zoom
  nudge, `clamp(hit, 0, 1) * 0.04`. Measured peaks of **3.4** on mic — everything above 1.0
  was thrown away. Added `kickExcess = clamp((wavelet_bassHit - 1.0) * 0.5, 0, 1)` (maps
  hit 1→0, 3→1) into `catchPulse` at +1.1. Normal hits ride the existing bass_pump/flux/
  crest terms; a REAL kick snaps a bright specular glint. Put on the CATCHLIGHT (a tiny
  bright dot) rather than a global flash — reads as the eye catching a strobe, not the
  whole frame strobing.
  **Closed an open question from iter6:** sampled `washGate` over 60 samples — **max 1.0,
  avg 0.307, open (>0.3) 38% of the time.** The gate fires properly and often; the 0.131
  reading last tick was one unlucky sample, NOT a too-tight threshold. No decay/hold needed.

- iter8: **PULSING BEAT ZOOM — user request ("pulsing zoom with the beat. Don't use the
  `beat` uniform").** Prior art read from journals: the-coat-15 iter9 settled ~8.5% total as
  "slight but visible" (but used the `beat` bool for its 6% snap — ruled out here); clit-2
  used `bassZ * 0.08`; dodeca-bloom iter34 used `bass_pump * BASS_REACT * 0.12`.
  **ROOT CAUSE of the old flicker:** `bass_pump = clamp(wubDepth + waveletBassSpring*0.5)`
  and `wubDepth` was measured **pinned at 1.0**, so `bass_pump` saturates permanently. Its
  0.05 term in `kickZoom` was a CONSTANT 5% push — a fixed offset, not a pulse. Only the
  bassZ spike moved, hence flicker-not-breath.
  **FIX — a kick envelope from signals that actually swing:**
  `kickAttack = pow(waveletBeat, 0.6)` (fast attack on the self-calibrating spike) +
  `kickSnap = clamp((wavelet_bassHit-1)*0.5)` (sharp transient) +
  `kickBody = smoothstep(0.05, 0.55, waveletBassSpring)` (spring-eased LEVEL for the decay
  tail, replacing saturated bass_pump). Weights 0.055/0.025/0.035, cap 0.095, × BASS_REACT
  × LIVE_GATE. Measured between beats: 3.6% (body only); kicks push toward 9.5%.
  **Note on measurement:** `bass_pump` is a shader `#define`, NOT a uniform — a JS probe of
  `f.bass_pump` reads undefined. Recompute it from `wubDepth + waveletBassSpring*0.5` when
  sampling from the page. (Cost me one wrong "pump is dead" reading before I caught it.)

- iter9: **HOLD + VERIFY.** Audio in a drop-out (bass 0.013, all bands ~0.04, LIVE_GATE 0,
  thin airy content: centroid 0.669, rolloff 0.838). Any new gated geometry would be
  invisible, so no shader edit this tick — verified iter8 instead.
  **Beat zoom measured over 200 samples @100ms (20s of music before the drop):** min 0.00%,
  max **9.50%** (hits the cap), avg 1.80%, swing 9.5%, **13 kicks over 7%**. It pulses to
  the cap on kicks and rests at ZERO between them — a real kick envelope, not the constant
  5% offset the old bass_pump term produced. User request satisfied.
  **wubDepth observation:** reads **0.796** in this drop-out, not 1.0 — so it DOES move; it
  saturates only while music is playing. Consistent with `min(1, wubDepth*4)` being the
  culprit (×4 gain too hot for mic), not with `deviation` being broken. Passed to the
  wubDepth audit subagent.

- iter10: **LIVE_GATE — beat-confirmed term. Bug in my own iter3/4 gate.** Caught a
  QUIET-AND-PUNCHY passage: `waveletBassZScore` **1.251** + `wavelet_bassHit` **2.101**
  (unambiguous kicks) while `waveletBassSpring` sat at **0.051** — under the 0.10 level
  floor. `LIVE_GATE` read 0 and the iter8 beat zoom (`× LIVE_GATE`) was **suppressed on a
  hard kick**: computed pulse 0.069 × 0 = 0. The level-only gate assumed loud == present;
  a structured beat proves signal just as well. Added a third OR term:
  `smoothstep(0.6, 1.2, waveletBassZScore)` — needs a REAL spike (0.6σ→1.2σ), and bassZ
  decays fast so it can't hold the gate open on noise. `LIVE_GATE` is now
  `max(max(quietGate, levelGate), beatGate)`. COLOR_GATE inherits it automatically.
  **Verification status:** GL-validated clean. Live recompute landed on true silence
  (wbass 0.006, bassZ −0.254) so all gates read 0 — correct by construction (bassZ 1.251 →
  beatGate 1.0) but NOT yet measured on a real kick. Sampler armed; prove it iter11.
  **Lesson:** every gate I add needs to be tested against the passage type it was NOT
  designed for. Level gate was designed for "quiet room vs music" and failed on
  "quiet music with kicks".

- iter11: **DRONE gate → PUPIL DILATION. The pupil had been INVISIBLE all session.**
  `pupilRad = knob_14 * 0.16 * (...)` and `knob_14` is NOT in the header preset → uniform
  defaults to 0 → `step(0.001, pupilRad)` masks the pupil to nothing. Every screenshot's
  dark centre was the ribbed CORE geometry, not the pupil. A whole anatomical feature off.
  Measured a sustained SUB-BASS DRONE at tick start: **centroid 0.13** (darkest of the
  session), **tonal 1.889**, wbass 0.216, all higher bands ≤0.09, no kicks. A drone is the
  one passage where a pupil OPENING is the honest visual — the eye dilates into the dark.
  `droneGate = smoothstep(0.35,0.10,centroid_env) * smoothstep(0.80,1.50,tonalStrength)
   * smoothstep(0.08,0.30,bass_env) * LIVE_GATE`; `pupilBase = knob_14 + droneGate*0.62`.
  Keyed on the two signals that scream (dark + tonal), NOT on `monsterBass` — its bass_env
  term was too weak (0.216) to carry it. knob_14 remains a manual base on top.
  **Honest status:** by the time I validated, centroid had climbed 0.13 → 0.375 and the
  drone had passed — `dark` term 0, other three saturated. Gate correctly closed on the
  brighter passage; pupil not yet SEEN. Drone sampler armed (60s window); prove iter12.
  **Beat-gate proof from iter10:** 28s / 14 kick frames / **0 rescued** — this passage was
  loud enough that level alone opened the gate every time. Fix is dormant-but-correct;
  still unmeasured on a quiet-punchy passage. Sampler stays armed.
  **Also:** `knob_14` removed from `unwiredKnobs` — it now has a job.

## Cool moments
- **iter6 HOT RED-ORANGE COLLARETTE / FIRST WARM CORE (2026-09-06)** — first warm-core
  frame of the session; every prior frame was green- or blue-dominant. **Audio:** the wash
  profile — spread 0.90 (term saturated 1.0), spectralEntropySmooth 0.815 (term 0.961),
  crest 0.284, quietGate 0.412, LIVE_GATE 0.92, washGate 0.131.
  **Visual:** blazing hot red-orange collarette ring around a dark ribbed pupil, violet-
  magenta petal band, blue outer corona, green mirror field at the edges.
  **What worked:** the wash drift moves the palette to a region the bass-driven effects
  never reach, so noisy breakdown passages now look *different* rather than just dimmer.
  **Follow-up (iter7):** windowed sampling showed the gate actually hits max 1.0 and is open
  38% of the time — the 0.131 single-sample reading was misleading. No hold needed.
  **Design hypothesis:** describe a passage by what it LACKS (no peaks) as well as what it
  has — inverted-crest is a more reliable wash detector than any positive term alone.

- **iter5 RED-CORE PETALS / GREEN CRYPT FLAMES (2026-09-06)** — widest hue range of the
  session. **Audio:** LOUD passage — quietGate 0.928 (vs ~0 earlier), waveletBass 0.536,
  b2 0.500, bassZ +0.849, **rolloff 0.86 + spread 0.79** (were 0.006/0.34 one tick earlier —
  real high-end content arrived), entropy 0.799, roughness 0.533, tonal 0.286.
  **Visual:** green-cyan crypt flames radiating from a blue-green ribbed pupil, with
  **red-cored petals** scattered through the outer mirror field against blue-violet.
  **What worked:** giving colour a FLOOR (0.35) instead of a gate. Hue keeps moving through
  quiet passages instead of snapping to a default, so transitions read as musical rather
  than as the visualiser switching off.
  **Design hypothesis:** gate GEOMETRY hard (it should hold still when there's nothing to
  say) but gate COLOUR softly with a floor — a static palette reads as "broken", a static
  shape reads as "calm".

- **iter4 ELECTRIC-BLUE RIPPLE CORONA (2026-09-06)** — first frame where the fractal-
  complexity modulation was actually alive. **Audio:** waveletBassSpring 0.625, b2 0.565,
  b3 0.416, b5 0.419, centroid 0.352, bassZ +0.678, **crest 0.684 + skew 0.826 + kurt 0.665
  all high**, roughness 0.027 and rolloff 0.006 near zero — sharp, peaky, tonal, no high end.
  quietGate 0.0 / bassGate 1.0 / limbalBloom 0.654. **Visual:** electric-blue corona ring
  with fine concentric ripple banding around a dark ribbed pupil, green mirror field pushed
  to the frame edges. The ripple structure is `RIPPLE_FREQ`'s spread term rendering for the
  first time — it had been multiplied by zero.
  **Design hypothesis:** any shader term gated on absolute loudness needs a self-calibrating
  OR-term before it can be trusted on mic. Prefer `Normalized`/`ZScore` variants in gates.
- **iter1 CYAN-MAGENTA LIMBAL FILAMENT (2026-09-06)** — **Audio:** quietGate 0.45,
  waveletBassSpring 0.43 (peaks 0.855), band2 0.19, band5 0.23, centroid 0.221,
  wavelet_bassHit 1.47 firing, tonal 0.408, crest 0.069. Bass-dominant, low-brightness.
  **Visual:** the bloomed limbal reads as a bright cyan→magenta filament tracing the
  collarette edge, with the whole frame opening outward — green infinity-mirror field
  pushed to the corners, blue-violet petal band deepened between filament and pupil.
  **What worked:** putting the beat on the LARGEST form rather than adding another small
  overlay. Reads at projection distance in a way rim/sparkle effects don't.
  **Design hypothesis:** on ambient-mic material, prefer ONE large-form modulation over
  several small ones — mic audio lacks the transient sharpness that makes fine detail
  effects legible.

## Todo
- `[ ]` Drone threshold `smoothstep(0.35, 0.10, centroid)` — if the pupil never appears
  across a full set, 0.35 is too tight for "bassy but not drone" music; try 0.45.
- `[ ]` Pupil is now ONLY visible on drones (knob_14 = 0). If the user wants a resting
  pupil, set `knob_14≈0.3` in the preset URL — that's a preset change, not a shader one.
- `[ ]` **`wubDepth` is pinned at 1.0 on mic** — `wavelet-ease.js:177-178` (`min(1, wubDepth*4)`)
  saturates on room audio. Anything downstream of `bass_pump` is a constant on mic. Worth
  fixing at the controller (self-calibrate the ×4) — but it changes direct-in too. Ask first.
- `[ ]` Beat zoom: if "more" is requested, widen the 0.095 cap and the 0.055 attack weight —
  the-coat-15 found 8.5% "slight"; there's room to ~14% before it reads as nauseating.
- `[x]` **Audit the rest of the shader for bare `* quietGate`** — done iter5. Zero bare
  sites remain; geometry on LIVE_GATE, palette on COLOR_GATE.
- `[ ]` Consider fixing `quietGate` at the source (`wavelet-ease.js:159`) to ride a
  Normalized energy variant instead of raw — would fix every shader at once, but changes
  behaviour for direct-in sessions too. Ask before doing it.
- `[ ]` `wavelet_bassHit` peaks ~3.4 on mic — if it reads much higher on direct-in, the
  `(hit-1.0)*0.5` scale may saturate too easily. Re-check at a tab-audio show.
- `[ ]` Watch whether `limbalPush` at 3.5% is enough at projection distance; widen the
  lever (not add an effect) if the user asks for "more".
- `[ ]` Unwired knobs to consider: 3, 6, 9, 10, 12, 13, 14, 15, 16, 19. Wire what the user
  actually reaches for.
- `[ ]` band2/band3/band4 (mid octaves) are still lightly used vs bass — mid-dominant
  passages have less to say right now.

## Design hypotheses for v(next)
- Texture space wants THREE corners minimum: sub-heavy, bright-chaotic, and broadband-wash.
  Two gates leave a hole that noisy breakdowns fall straight through.
- Gates should be declared EARLY in `mainImage` if they may need to modulate `structure`.
- Mic sessions: `quietGate` must gate any large-form modulation, or room tone in the gaps
  reads as an unmotivated wobble.
- `waveletBassZScore` is the right beat source for mic work — self-calibrating across
  gains, unlike raw level thresholds.
