// @fullscreen: true
// moody-octopus dark — outlines only, mostly black. Dark-tent safe.

// ============================================================================
// DARKNESS BUDGET — how much light this thing is allowed to emit
// ============================================================================
// Line brightness. Backed off on chaotic material: measured iter 15 at
// entropy 0.93 / spread 0.81, line CORES carried 68% of frame luma from only
// 7.4% of pixels while the band cap never bound — i.e. the overshoot there is
// per-line brightness, not line count. Chaotic passages already put a lot of
// line on screen, so each line should give back some of its gain.
// 0.40 reduction was too deep (frame went near-empty when a quiet passage
// coincided); 0.22 keeps chaotic material in check without gutting sparse ones.
#define INK_GAIN        ((0.85 + energyNormalized * 0.35) \
                       * (1.0 - smoothstep(0.60, 0.92, spectralEntropyNormalized) * 0.22))
// Transients (spectralCrest) snap the linework taut instead of flashing it —
// thinner, sharper lines on a hit. Keeps kicks legible without spending
// brightness budget.
#define LINE_WIDTH      (max(1.1 + trebleZScore * 0.25 - max(spectralCrestZScore, 0.0) * 0.30, 0.35))
#define GLOW_AMOUNT     (0.10 + bassNormalized * 0.10)     // faint halo, keep tiny
// Trail persistence. This is the single biggest brightness lever in the shader:
// with max(col, prev*decay), decay 0.87 keeps a pixel lit for ~15 frames, so
// trails accumulate across the frame and dominate mean luma even when the
// linework itself is sparse. Measured: 0.87 held meanLuma at 0.094 with
// DENSITY only 0.36. Keep this well under 0.80.
#define FEEDBACK_DECAY  (0.62 + bassNormalized * 0.10)     // trail persistence
// Hue: slow autonomous drift so steady grooves keep evolving, nudged by
// centroid (alive even when z-scores flatten). pitchClass often reads 0 on a
// live mic, so it can't be the only hue driver.
#define HUE_DRIFT       (time * 0.006)
#define HUE_BASE        (fract(0.55 + HUE_DRIFT + spectralCentroidNormalized * 0.22))
#define HUE_SPREAD      (0.16 + spectralEntropyNormalized * 0.14)
#define WARP            (spectralCentroidZScore * 0.03)
#define BEAT_KICK       (bassZScore)
// Surge: energy spiking well above its own baseline. Uses energyZScore, NOT
// energySlope — measured iter 9, ALL *Slope / *RSquared features read
// 0.0000 / 0.00 on this input, so anything built on them is dead code.
// Measured iter 9: gating at (0.25, 1.00) AND multiplying by a second
// smoothstep fired in only 2/18 frames. Stacked gates multiply their
// selectivity — two "reasonable" gates make an unreachable one.
#define SURGE           (smoothstep(0.05, 0.65, energyZScore))
// Sparseness: when the room goes quiet, thin the linework to a few strands.
// Driven by energy OR bass — a deep sub-bass groove reads low on
// energyNormalized but must NOT thin out; that's the heaviest moment in the
// room and the visual has to be present for it.
// Bass contributes a FLOOR, not a full vote — enough that deep grooves stay
// visible, not so much that a sub-bass passage renders as densely as a
// full-spectrum one. (Measured: bass*0.85 pushed meanLuma 0.037 -> 0.095.)
// "Presence" = how much the room is actually doing, across the whole spectrum.
// Energy alone misses a sub-bass groove; energy+bass alone misses a bright
// airy passage (measured iter 7: treble 0.65 but presence only 0.38 -> the
// frame fell under the darkness floor). Take the strongest band, whichever it is.
#define PRESENCE        (max(max(energyNormalized, bassNormalized * 0.42), \
                             trebleNormalized * 0.38))
// Floor raised 0.30 -> 0.62 (iter 5): with the flux phase scroll, fewer pixels
// sit on a band edge at any instant, and the frame measured meanLuma 0.009 —
// a near-empty projection. There must always be enough line to read as an image.
#define DENSITY         (0.62 + PRESENCE * 0.70)
// Filigree: fine shimmer riding the line edges on gritty/complex passages.
// NOT keyed to treble — measured on this mic, trebleZScore cleared zero in 1
// frame out of 20 (peak ink contribution 0.04), so the treble version was dead
// code for 4 ticks. Roughness and entropy both carry real range here.
#define FILIGREE        (smoothstep(0.15, 0.55, spectralRoughnessNormalized) \
                       * smoothstep(0.25, 0.65, spectralEntropyNormalized) * 0.55)

// Julia iteration returning both the escaped point and a smooth escape value
// so we can contour it instead of flood-filling it.
vec3 juliaField(vec2 p, float t) {
    float cRe = sin(t) * 0.7885 + spectralSkewNormalized / 200.0;
    float cIm = cos(t) * 0.7885 + spectralRolloffNormalized / 200.0;

    float smoothIter = 0.0;
    int maxIter = 48;
    for (int i = 0; i < maxIter; i++) {
        float x = p.x * p.x - p.y * p.y + cRe;
        float y = 2.0 * p.x * p.y + cIm;
        p = vec2(x, y);
        float r2 = dot(p, p);
        if (r2 > 4.0) {
            // smooth (continuous) escape count
            smoothIter = float(i) - log2(max(log2(sqrt(r2)), 1e-4));
            return vec3(p, smoothIter);
        }
        smoothIter = float(i);
    }
    return vec3(p, smoothIter);
}

// Just the scalar escape value — used for finite-difference edge detection
float juliaScalar(vec2 p, float t) {
    return juliaField(p, t).z;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    vec2 texUv = fragCoord.xy / iResolution.xy;

    float t = time / 10.0;
    t += BEAT_KICK / 15.0;

    // gentle drift so the tentacles breathe
    uv += vec2(sin(t * 2.0) * WARP, cos(t * 2.3) * WARP);
    uv *= 1.0 + BEAT_KICK * 0.02;

    // Steady-groove breath: when the music flattens out (z-scores near zero,
    // no trend), the audio-driven motion all but stops. Fade in a slow
    // autonomous swell so the arms keep drifting instead of freezing.
    float calm = 1.0 - smoothstep(0.0, 0.6, abs(energyZScore));
    uv *= 1.0 + sin(time * 0.31) * 0.035 * calm;
    uv += vec2(cos(time * 0.19), sin(time * 0.23)) * 0.02 * calm;

    // Treble tremble: on hi-hat/cymbal-forward material the arms shiver at high
    // frequency. Displacement only — it moves line, never adds light, so it
    // stays inside the tent budget. Gated on treble being genuinely present so
    // bass-heavy passages don't get a jitter that isn't in the music.
    float shimmer = smoothstep(0.30, 0.75, trebleNormalized);
    float trem = shimmer * (0.004 + max(trebleZScore, 0.0) * 0.006);
    uv += vec2(sin(uv.y * 34.0 + time * 21.0),
               cos(uv.x * 31.0 + time * 18.0)) * trem;

    // Surge stretch: on an energy spike with the spectrum riding high (centroid
    // up, bass gone), the creature ELONGATES and unwinds — a radial pull plus a
    // swirl that increases with distance from centre. Geometry only, no light.
    // Blend rather than multiply the second condition — centroid biases the
    // strength but can't veto the effect outright.
    float highAndThin = smoothstep(0.35, 0.80, spectralCentroidNormalized);
    float pull = SURGE * mix(0.45, 1.0, highAndThin);
    float r = length(uv);
    float swirl = pull * 0.35 * r;
    float cs = cos(swirl), sn = sin(swirl);
    uv = mat2(cs, -sn, sn, cs) * uv;
    uv *= 1.0 - pull * 0.10;

    // Sub-bass swell: deep material (bass high, centroid collapsed to the
    // bottom of the spectrum) pushes the arms outward from centre, so the
    // creature looks like it's being displaced by pressure rather than lit up.
    // Gated on LOW centroid so it stays silent on bright bass-y material.
    float deep = smoothstep(0.30, 0.06, spectralCentroidNormalized)
               * smoothstep(0.35, 0.80, bassNormalized);
    // Softened at iter 5: the original 0.10 + bz*0.12 hollowed out the centre
    // of the frame on sustained bass, leaving structure only at the edges.
    float swell = deep * (0.04 + max(bassZScore, 0.0) * 0.07);
    uv *= 1.0 - swell;

    // --- Contour extraction -------------------------------------------------
    // Sample the escape field and its neighbors; the LINES are where the field
    // changes fastest. Everything else stays black.
    vec2 e = vec2(1.6 / iResolution.y, 0.0);

    float f  = juliaScalar(uv, t);
    float fx = juliaScalar(uv + e.xy, t);
    float fy = juliaScalar(uv + e.yx, t);

    float grad = length(vec2(fx - f, fy - f));

    // Band the field into level curves — these become the octopus outlines.
    // Band count, ceilinged against what a pixel can actually resolve. Above
    // roughly one band per pixel the level curves alias into each other: the
    // smoothstep averages toward mid-grey, NO pixel reaches full line
    // brightness, and the frame goes dim and mushy rather than bright.
    // (Measured at bands 1.63: peakLuma collapsed 0.643 -> 0.216.)
    // `grad` is the field's rate of change per pixel, so bands * grad is
    // roughly bands-per-pixel — hold that under ~0.5 (Nyquist).
    // Two ceilings, both necessary:
    //  1. Nyquist — above ~1 band/pixel the curves alias into grey mush.
    //  2. Aesthetic — the brief is OUTLINES ON BLACK. Dimming a dense frame
    //     keeps emitted light legal but reads as a mottled field, not linework
    //     (observed iter 9). So cap absolute band count too: a busy passage
    //     must render as FEWER lines, not many dim ones.
    float rawBands = (0.55 + spectralSpreadNormalized * 1.6) * DENSITY;
    // Aesthetic cap, tuned by measuring `rawBands` under real material:
    //   1.05 (iter 9)  — bound constantly; rawBands reads ~1.13 on ORDINARY
    //                    material, so this held the frame under the darkness
    //                    floor 16/18 frames. Too tight.
    //   1.45 (iter 12) — barely binds; rawBands averaged 1.345, so the frame
    //                    rendered ~25% more line and meanLuma hit 0.105 with
    //                    24/24 frames OVER the ceiling. Too loose.
    //   1.20 (iter 13) — better, but still let 18/20 frames over the ceiling on
    //                    mid-dominant material where rawBands averaged 1.31.
    //   1.10           — small step down from 1.20 (NOT back to 1.05, which was
    //                    measured too tight at iter 12). Bisecting between two
    //                    known failures rather than jumping.
    float bands = min(min(rawBands, 0.5 / max(grad, 0.02)), 1.10);
    // Timbral hits (spectralFlux) shove the contour phase, so the level curves
    // jump to new positions and the whole linework visibly reconfigures.
    // Costs no brightness — it moves line, it doesn't add line.
    float phase = max(spectralFluxZScore, 0.0) * 0.55 + time * 0.02;
    float level = fract(f * 0.5 * bands + phase);
    float contour = min(level, 1.0 - level);           // distance to nearest band edge
    float lineMask = 1.0 - smoothstep(0.0, 0.035 * LINE_WIDTH, contour);

    // Outer silhouette edge: where the set boundary is, gradient spikes.
    float edgeMask = smoothstep(0.35, 2.2, grad);

    // Filigree: a second, much finer contour set that only appears on bright
    // treble-forward passages. Rides the same field so it traces the same arms.
    // Filigree is 3.1x finer than the main contours, so it aliases first. Fade
    // it out wherever the field moves too fast for the lacework to resolve —
    // otherwise it turns to grey mush in exactly the high-gradient regions.
    // Fade the filigree on TWO axes, not just gradient:
    //  (a) gradient — it's 3.1x finer than the main bands so it aliases first.
    //  (b) how dense the main bands ALREADY are. Measured iter 14 on a stable
    //      mid-dominant passage: filigree averaged 0.35 and pegged at its 0.55
    //      ceiling while `bands` was already at the 1.20 cap. A fine contour set
    //      stacked on top of saturated coarse bands is what produces STIPPLE
    //      (seam rate 0.11, ~3x threshold) and it also pushed meanLuma to 0.094.
    //      One root cause, both failures.
    // Key this to rawBands (the UNCAPPED demand), not the capped `bands`.
    // Bug found iter 16: the window was written as smoothstep(0.85, 1.20, bands)
    // at iter 14 when the cap was 1.20, then the cap was lowered to 1.10 in the
    // same tick. Since `bands` can then never exceed 1.10, the smoothstep never
    // reached 1.0 — the gate topped out at ~0.29 and could never fully suppress
    // filigree. Measured: filigree pegged at its 0.55 ceiling in 10/10 samples
    // while rawBands averaged 1.83 and the cap bound every frame.
    // rawBands keeps rising past the cap, so it still signals density correctly.
    // Window widened after first attempt: (0.90, 1.60) suppressed filigree
    // almost entirely on this material (rawBands ~1.83) — seams fell to 0.001
    // and hue bins recovered to 6, but meanLuma dropped to 0.015 with 21/22
    // frames under the floor. (1.15, 2.10) keeps the gate meaningful without
    // erasing the fine detail that gives the pods their texture.
    float bandsHeadroom = 1.0 - smoothstep(1.15, 2.10, rawBands) * 0.85;
    float fineFade = (1.0 - smoothstep(0.10, 0.30, grad)) * bandsHeadroom;
    float fine = fract(f * 3.1);
    float fineContour = min(fine, 1.0 - fine);
    float filigreeMask = (1.0 - smoothstep(0.0, 0.012, fineContour)) * FILIGREE * fineFade;

    float ink = max(lineMask * 0.75, edgeMask);
    ink = max(ink, filigreeMask * 0.55);

    // --- Color: thin spectral lines, nothing else ---------------------------
    float finalAngle = atan(uv.y, uv.x);

    // Hue varies with STRUCTURE, not just position. The frame had gone
    // monochrome (every line the same violet) because `f * 0.012` is too small
    // a coefficient to separate anything. Split the palette by what a pixel
    // IS: smooth sweeping arms (low gradient) sit at the base hue, while the
    // dense fractal sucker-pods (high gradient) shift away from it. That's the
    // two-colour separation that made the iter 5 / iter 7 frames read as a
    // creature rather than a pattern.
    // `grad` is a finite difference over an iteration COUNT, so it jumps
    // discontinuously at escape-band boundaries. Driving hue with it directly
    // painted hard rectangular blocks at those seams (observed iter 10).
    // Compress with a smooth saturating curve instead of a smoothstep window:
    // grad/(grad+k) has no hard knees, so seams blend instead of banding.
    // REVERTED to the iter-10 constant after an iter-11 experiment made things
    // worse. Attempts that FAILED here, do not repeat:
    //  - `structure = smoothstep(0.12, 0.88, structure)` to separate the two
    //    gradient populations: meanLuma 0.004, true black 0.93 (frame empty).
    //  - spread-adaptive `gradScale = mix(0.45, 0.95..1.30, spread)`: recovered
    //    to 0.016 but still under the darkness floor, and hue bins stayed at 3,
    //    so it did NOT fix the monochrome problem it was aimed at.
    // Diagnosis for a future tick: on a dense passage (entropy 0.84, spread
    // 0.69) the gradient histogram bunches up and hue variety falls to ~3 bins.
    // The hue SWING is fine (measured 0.242 of the wheel) — it's the gradient
    // DISTRIBUTION that collapses. A real fix needs a second, gradient-
    // INDEPENDENT hue axis, not a reshaping of this one.
    float structure = grad / (grad + 0.45);

    // SECOND HUE AXIS (iter 12, the deferred fix — attempted on a verified
    // stable passage: lit-drift ratio 1.15 across the measurement window).
    // The escape value `f` was already here at coefficient 0.012, but `f` spans
    // 0..48, so that covered only ~0.58 of the wheel across the WHOLE fractal —
    // locally adjacent regions came out nearly identical. Wrapping it at a much
    // higher rate gives colour that cycles with escape-time BANDS, which are
    // independent of the gradient magnitude. So when a dense passage bunches
    // the gradient histogram (iter 11: hue bins 7 -> 3), this axis still
    // separates the image.
    float escapeBand = fract(f * 0.11);
    float hue = fract(HUE_BASE
                    + structure * (0.16 + HUE_SPREAD * 0.30)
                    + escapeBand * (0.20 + HUE_SPREAD * 0.40)
                    + finalAngle * 0.05 * HUE_SPREAD);
    // Low lightness ceiling — never approach white.
    // Perceptual compensation: at equal HSL lightness, green/yellow read far
    // brighter than blue/violet. Pull lightness down near the green-yellow peak
    // (hue ~0.25) so the hue drift doesn't spike apparent brightness in the tent.
    // Mids drive SATURATION — the one band with no role until now, and
    // semi-independent from both bass and treble. A scooped mid-range (content
    // at the top and bottom, hollow middle) desaturates toward near-monochrome
    // line; full mids push rich colour.
    float sat = mix(0.30, 0.95, smoothstep(0.15, 0.60, midsNormalized));

    // TRUE luma normalisation. Both hue and saturation move perceived
    // brightness, in hue-dependent and opposite directions (measured at fixed
    // HSL lightness: desaturating RAISES blue's luma by 0.195 but LOWERS
    // yellow's by 0.195). A hue-only gaussian could not correct that — it left
    // a 0.673 luma spread across the hue x sat space.
    // So don't approximate: build the colour, measure its actual Rec.709 luma,
    // and rescale to a fixed target. Now every hue at every saturation emits
    // the same light, which is what a dark venue actually requires.
    vec3 rawColor = hsl2rgb(vec3(hue, sat, 0.5));
    float rawLuma = dot(rawColor, vec3(0.2126, 0.7152, 0.0722));
    const float TARGET_LUMA = 0.34;
    vec3 lineColor = rawColor * (TARGET_LUMA / max(rawLuma, 0.02));
    lineColor = min(lineColor, vec3(0.80));   // no channel runs away

    vec3 col = lineColor * ink * INK_GAIN;

    // Faint halo so lines read on a projector without lighting the tent
    col += lineColor * edgeMask * GLOW_AMOUNT * 0.35;

    // --- Feedback trails (dark: multiply-decay, never additive to white) ----
    vec3 prev = getLastFrameColor(texUv + vec2(0.0, -0.0008)).rgb;
    prev *= FEEDBACK_DECAY;
    col = max(col, prev);

    // Hard black floor: kill anything that isn't a line. The threshold RISES
    // with coverage — on a dense frame the dim tail of the linework is what
    // turns the image to grey mush, so crush more of it rather than letting
    // uniform dimming lift near-black pixels into visibility.
    // Coverage estimate: `ink` is this pixel's line fraction and the band
    // structure repeats, so it's a decent local stand-in for the frame's lit
    // fraction. Blended with the density term — DENSITY alone tracks band count
    // rather than lit AREA and over-darkened when used by itself.
    float coverage = clamp(mix(ink, DENSITY * 0.30, 0.5), 0.04, 1.0);
    // Engage EARLIER (was 0.10..0.45). Measured iter 11: a dense passage with
    // lit fraction 0.475 put 13/16 frames over the ceiling because the penalty
    // had barely started ramping at that coverage. The dense-passage response
    // has to be well underway before the frame is already too bright.
    float dense = smoothstep(0.06, 0.30, coverage);
    float floorLo = mix(0.02, 0.16, dense);
    float floorHi = mix(0.10, 0.34, dense);
    col *= smoothstep(floorLo, floorHi, max(col.r, max(col.g, col.b)));

    // --- Automatic exposure control -----------------------------------------
    // The tent needs mean emitted luma inside a narrow band (~0.025-0.055), but
    // density, hue, saturation and feedback all move with the music, so a
    // hand-tuned constant only holds for the passage it was tuned on. Over
    // iters 4-9 this drifted out of band five times in both directions.
    // Instead of tuning coefficients, estimate this frame's own contribution to
    // mean luma and scale it back toward the target. `ink` is the fraction of
    // this pixel that is line, so ink * luma(col) is its share of the frame
    // mean; PRESENCE-driven density sets roughly how many such pixels exist.
    float pixelLuma = dot(col, vec3(0.2126, 0.7152, 0.0722));
    float estFrameMean = pixelLuma * coverage;
    // Tuned by measurement, not intuition (iter 9). 0.042 with clamp
    // [0.55, 1.45] gave 18/26 frames in band. Tightening to 0.038 / [0.42, 1.45]
    // to shave the overshoots instead put 0/30 frames in band, ALL under — the
    // lower target and the wider darkening clamp compounded. Do not "tighten"
    // these two together without re-measuring.
    const float TARGET_MEAN = 0.042;   // centre of the 0.025-0.055 tent band
    float exposure = TARGET_MEAN / max(estFrameMean, 0.004);
    // Asymmetric authority: room to pull DOWN (a bright frame blinds the room)
    // but less room to push UP (a dim frame is merely dim).
    // Lower bound stays 0.40. DO NOT lower it — tried at iter 15 and reverted:
    //   0.26 -> 22/22 frames UNDER the floor.
    //   0.33 -> 23/24 OVER, seam rate 0.174 (worst of session), screenshot
    //           showed magenta flooding the frame and corner block artifacts.
    // Diagnosis: `exposure` is a per-frame reaction with NO MEMORY, so widening
    // its authority makes it chase a moving input harder in BOTH directions
    // rather than tracking it. The lever for a too-bright frame on extreme
    // material is not more exposure gain.
    // Useful measurement from that attempt: on entropy-0.93 material the band
    // cap never bound (rawBands averaged 0.905 vs the 1.10 cap) and line CORES
    // carried 68% of luma from 7.4% of pixels — so overshoot there is per-line
    // brightness, not line count. A future fix should reduce INK_GAIN or the
    // lightness target under high entropy, not widen exposure.
    col *= clamp(exposure, 0.40, 1.45);

    // --- Hard coverage guarantee --------------------------------------------
    // The exposure term above works on an ESTIMATE and was tuned across windows
    // where the input itself was moving (measured lit fraction ranged 0.13 ->
    // 0.72 within one tick), so it cannot be trusted as a bound. This is the
    // actual guarantee: as coverage rises, scale every pixel down by the same
    // factor, so total emitted light stays bounded no matter how dense the
    // linework gets. A busy frame therefore renders as MANY DIM lines rather
    // than many bright ones — which is the correct trade in a dark tent.
    // Coverage penalty strength, bracketed by measurement on stable input:
    //   3.2 / 2.4 (iter 9)  -> 7/20 frames OVER the ceiling on dense material.
    //   4.6 / 2.6 (iter 13) -> 20/20 UNDER, lit fraction collapsed 0.35 -> 0.04.
    //                          Far too aggressive; this term is very sensitive.
    //   3.6 / 2.5 (iter 13) -> 22/22 frames in band, PERFECT brightness — but
    //                          seam rate 0.075 (2x threshold) and the picture
    //                          showed the linework broken into speckled stipple.
    //                          Crushing the dim tail of each line fragments it.
    // Back to 3.2 / 2.4: brightness is handled well enough by the band cap at
    // 1.20 plus auto-exposure, and CONTINUOUS LINE matters more than a perfect
    // luma histogram. A frame can score ideal on every brightness metric and
    // still have disintegrated into dots.
    float coverPenalty = 1.0 / (1.0 + coverage * 3.2);
    col *= mix(1.0, coverPenalty * 2.4, dense);

    // Absolute brightness clamp for the tent
    col = min(col, vec3(0.72));

    fragColor = vec4(col, 1.0);
}
