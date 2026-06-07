// @fullscreen: true
// @mobile: false
// moire-eye-4 — fork of moire-eye-3 (clean de-noised full-anatomy iris + spectral audio map +
// TREND/Rslopes). eye-4 OPENS UP TO THE FULL FRAME: curling fractal TENDRILS/arms radiate around
// the iris into what used to be void, spiralling and curling with the music; and the pupil gains
// a deeper TUNNEL — concentric rings receding inward for real depth into the eye. The iris anatomy
// (fibres/crypts/furrows/collarette/ruff/limbal) and the spectral colour map are all carried over.
//
// ============================================================================
// AUDIO MAPPING  (spectral features + their stats → eye anatomy)
//   knob_11 = MASTER REACT amount (0.5x..2x) — wiggle to dial the whole response live.
// ============================================================================
// PHILOSOPHY (iris-7 + magic-peach/plasma journals): drive COLOUR, GEOMETRY, MOTION and
// SHARPNESS — NOT luminance. Brightness pumping is lazy; loud≠brighter, loud=more vivid.
//  pupil dilation   <- bass (MASS) + energyZScore(drop) + spectralFluxZScore(transient)  GEOMETRY
//  tunnel depth     <- bass swell (MASS), rate set by spectralFluxNormalized
//  iris SATURATION  <- energyNormalized + energyZScore (peach SAT_BOOST: loud=vivid, quiet=grey)
//  iris HUE rotate  <- spectralCentroidNormalized (bright songs sit cooler) + pitchClass accent
//  stroma sharpness <- spectralCrestNormalized (peaky=crisp granular streaks)   [iris-7 lesson]
//  stroma grit      <- spectralRoughnessNormalized (dissonance -> striation contrast)
//  stroma arms      <- spectralSpreadNormalized (harmonic width) + midsNormalized
//  iris warmth      <- spectralCentroidNormalized + spectralSkew tilt
//  collarette hue   <- pitchClassNormalized
//  airglow rim      <- spectralRolloffNormalized + trebleNormalized + trebleZScore
//  catchlight glint <- bass + spectralCrestNormalized (spiky spectrum -> sharper glint)
//  iris focus       <- spectralKurtosisNormalized (peaky spectrum -> tighter vignette)
//  stroma shimmer   <- spectralEntropyNormalized
//
//  iris dilation    <- TREND = (centroidSlope×RSquared + energySlope×RSquared): build→dilate, drop→constrict
//  Other knobs: 9 gazeY | 12 gazeX | 14 pupil | 1 zoom | 2 hue tint | 6 gold-core |
//               7 fibre density | 8 TREND amount | 13 anti-flicker | 16 outer glow | 19 catchlight

#define A(a) mat2(cos(a*6.2832+vec4(0, -1.5708, 1.5708, 0)))  // rotate
#define O(x,a,b) ((cos(x*6.2832)*.5+.5)*(a-b)+b)  // oscillate x between a & b
#define H(v) O(radians(vec3(0, 60, 120))+(v), 1., 0.)  // hue

// hex grid ( from FabriceNeyret2 )
vec2 hg(vec2 u)
{
    vec2 o = vec2(.5, .866),
         a = mod(u,   o+o)-o,
         b = mod(u-o, o+o)-o;
    return dot(a,a) < dot(b,b) ? a : b;
}

void mainImage( out vec4 C, in vec2 U )
{
    float t = mod(iTime/60., 10.),
          d = 0., i = d, s, r, n, nt;

    vec2 R = iResolution.xy;

    float REACT = 0.5 + knob_11 * 1.5;   // master react amount

    // ---- spectral feature shorthands (variety of independent domains + their stats) ----
    float fluxN   = clamp(spectralFluxNormalized, 0.0, 1.0);
    float fluxZ   = max(spectralFluxZScore, 0.0);          // timbral transient
    float spread  = spectralSpreadNormalized;               // harmonic width
    float rough   = spectralRoughnessNormalized;            // dissonance / grit
    float rolloff = spectralRolloffNormalized;              // where the highs die
    float crest   = spectralCrestNormalized;                // spiky vs smooth spectrum
    float kurt    = spectralKurtosisNormalized;             // peaky vs diffuse
    float entropy = spectralEntropyNormalized;              // chaos
    float skew    = spectralSkew;                           // dark/bright tilt
    float buildN  = max(spectralCentroidSlope, 0.0) * spectralCentroidRSquared * 40.0; // confident brighten trend
    buildN = clamp(buildN, 0.0, 1.0);
    // ===== TREND — the "Rslopes": slope × rSquared = which way the music is heading × how
    // CONFIDENTLY. Positive = a steady BUILD, negative = a confident DROP/fall. Chaotic change
    // (low rSquared) reads ~0. knob_8 = TREND amount — crank it to watch the eye anticipate
    // the song structure (pupil dilates through builds, snaps shut on the drop). =====
    float TREND = clamp((spectralCentroidSlope * spectralCentroidRSquared
                       + energySlope * energyRSquared) * 55.0, -1.0, 1.0) * (0.4 + knob_8 * 1.6);

    // === GAZE — kept GENTLE + clamped so the moiré body and the screen-space anatomy stay LOCKED.
    // At strong gaze they used to DECOUPLE (the body rotates while the rings translate, opposite
    // directions) → the eye split into top-rings + bottom-stroma. Both layers now turn together. ===
    float GAZE_STR = (0.18 + knob_19 * 0.30);
    vec2  saccade = vec2(sin(iTime*0.23), sin(iTime*0.19+1.3)) * 0.006;
    vec2  gaze = clamp(vec2(knob_12 - 0.5, knob_9 - 0.5) * 2.0 * GAZE_STR + saccade, -0.34, 0.34);
    vec2  m = gaze * vec2(0.45, 0.4);

    vec3 o = vec3(0, 0, -O(t/2., 80., 110.)),
         u = normalize(vec3(U-R/2., R.y*(0.45 + knob_1*0.85))),
         c = vec3(0), p, q;

    mat2 rh = A(m.x), rv = A(m.y);

    for (; i++<1e2;)
    {
        p = o+u*d;
        p.xz *= rh;
        p.yz *= rv;
        r = length(p);
        p *= sqrt(abs(1. - r*r/1e3));
        q.xy = p.xy - hg(p.xy/2.)*2.;
        n = length(q);
        nt = n*t;
        // tunnel ripple: bass swell, rate quickened by spectral FLUX (timbral motion)
        p.z = abs(p.z) - 1. - sin(nt*6.2832 + fluxN*1.5) * (1. + bassNormalized*0.5*REACT);
        s = length(p-q*vec3(1,1,0)) - min(.3, n/1e2) * (-sign(35.-r)*.5+.5);

        d += sqrt(s)*.35;
        c += min(s, .004*sqrt(d/s)) * H(nt) * O(nt, 1., .78) * min(1., 1.2e2/n); // SMOOTH moiré body: de-noised (dropped hi-freq sin(n*40) shimmer, raised cell floor .3->.78, tamed 2e2->1.2e2 spike)
        if (s < 1e-3 || d > 1e3) break;
    }

    // ===== EYE ANATOMY =====
    vec2 ec = (U - .5*R)/R.y - gaze*0.30;   // less drift so anatomy stays locked to the moiré body
    float er = length(ec);
    float ang = atan(ec.y, ec.x);

    // pupil HEADLINE: bass dilation + drop punch (energyZScore) + transient (fluxZ).
    float pupilRad = mix(0.05, 0.16, knob_14)
                   * (1.0 + (bassNormalized*0.32 + max(energyZScore,0.0)*0.28 + fluxZ*0.12) * REACT
                          + TREND*0.6);   // TREND: dilates through a build, constricts on the drop
    pupilRad = clamp(pupilRad, 0.02, 0.30);
    float pupil    = smoothstep(pupilRad, pupilRad*1.3, er);

    float irisMask = smoothstep(0.56, 0.46, er);
    float limbal   = smoothstep(0.40, 0.48, er) * smoothstep(0.54, 0.48, er);

    vec3 col = c;
    vec3 maw = c * vec3(0.55, 0.12, 0.06) * (0.10 + (1.0 - spectralCentroidNormalized)*0.12);
    col = mix(maw, col, pupil);
    col *= 1.0 - limbal*0.85;
    col *= irisMask;

    // warm-gold core: centroid sets temperature, spectralSkew tilts it dark/bright.
    float coreW = smoothstep(0.30, 0.05, er);
    float warmth = clamp((1.0 - spectralCentroidNormalized) + skew*0.15, 0.0, 1.5);
    vec3  goldTint = vec3(1.25 + warmth*0.40, 1.05, 0.65 - warmth*0.35) + vec3(sin(knob_2*6.2832))*0.15;
    col = mix(col, col * goldTint, coreW*(0.20 + knob_6*0.90));

    // stroma ARMS: width from spectralSPREAD (harmonic width), brightness from mids.
    float armInner = mix(0.24, 0.18, spread);
    float armOuter = mix(0.34, 0.44, spread);
    float armZone = smoothstep(0.10, armInner, er) * smoothstep(armOuter, armInner, er);
    col *= 1.0 + midsNormalized * armZone * 0.6 * REACT;

    // ===== IRIS ANATOMY (iris-7 structures), driven by audio =====
    // CILIARY STROMA FIBRES: fine radial striations. knob_7=DENSITY, roughness=CONTRAST, crest=SHARPNESS.
    float fibreN = 30.0 + knob_7*100.0;                 // knob_7 = stroma fibre density (30..130)
    float striae = 0.5 + 0.5*sin(ang*(fibreN + spread*30.0));
    striae = pow(striae, mix(1.0, 3.5, crest));        // crest sharpens the streak profile (iris-7: crest=sharpness)
    float striaeBand = smoothstep(0.09, 0.18, er) * smoothstep(0.50, 0.30, er);
    // baseline structure ALWAYS present (anatomy is foundational); roughness×REACT only deepens it
    col *= mix(1.0, mix(0.55, 1.0, striae), striaeBand * (0.40 + rough*0.55*REACT));

    // CRYPTS OF FUCHS: angular pits in the mid-stroma. entropy BLINKS them open (iris-7 crypt-blink).
    float crypt = pow(0.5 + 0.5*sin(ang*23.0 + 1.7), 5.0) * smoothstep(0.16, 0.22, er) * smoothstep(0.40, 0.26, er);
    col *= 1.0 - crypt * (0.20 + entropy*0.55*REACT);

    // CONTRACTION FURROWS: concentric ridge rings in the outer stroma. spread sets their pitch.
    // They DRIFT inward slowly on iTime (smooth) and DEEPEN on bass — amplitude, NOT phase, so the
    // kick flexes the musculature without strobing (audio-in-phase = strobe, per plasma lesson).
    float furrowFreq = 34.0 + spread*40.0;
    float furrows = 0.5 + 0.5*sin(er*furrowFreq - iTime*0.6);
    float furrowBand = smoothstep(0.24, 0.34, er) * smoothstep(0.50, 0.36, er);
    float furrowDepth = min(1.0, furrowBand * (0.40 + bassNormalized*0.5*REACT));
    col *= mix(1.0, mix(0.62, 1.0, furrows), furrowDepth);

    // iris FOCUS: spectralKURTOSIS tightens a soft vignette (peaky spectrum = focused eye)
    col *= 1.0 - smoothstep(0.20, 0.50, er) * kurt * 0.30 * REACT;

    // ===== COLOUR reactivity (magic-peach: drive HUE + SATURATION, NOT luminance) =====
    // ENERGY -> SATURATION (peach SAT_BOOST): loud passages go vivid, quiet mute toward grey.
    float satBoost = 0.55 + energyNormalized*0.55 + max(energyZScore, 0.0)*0.40*REACT + buildN*0.20;
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(luma), col, clamp(satBoost, 0.0, 1.7));
    // CENTROID -> HUE ROTATION: brightness-centre walks the iris hue family; pitchClass accents it.
    vec3 hsl = rgb2hsl(col);
    hsl.x = fract(hsl.x + (spectralCentroidNormalized - 0.5)*0.10*REACT + (pitchClassNormalized - 0.5)*0.04);
    col = hsl2rgb(hsl);

    vec3 outc = tanh(col*col*col);

    // outer stroma glow — static. knob_16 intensity.
    float outerBand = smoothstep(0.26, 0.42, er) * smoothstep(0.50, 0.40, er) * irisMask;
    outc += vec3(0.55, 0.62, 0.75) * outerBand * (0.04 + knob_16*0.16);

    // collarette: wavy mid-ring, PITCH tints it.
    float collR = 0.24 + 0.012*sin(ang*15.0);
    float coll = smoothstep(0.018, 0.0, abs(er - collR)) * irisMask;
    vec3  collHue = 0.55 + 0.45*cos(6.2832*(pitchClassNormalized + vec3(0.0, 0.33, 0.66)));
    outc += collHue * coll * 0.22;

    // LIMBAL RING: the defining dark blue-grey ring at the iris boundary that frames a real eye
    // (anatomy, audio-independent). A crisp cool band right at the iris edge.
    float limbalRing = smoothstep(0.032, 0.0, abs(er - 0.49)) * irisMask;
    outc = mix(outc, outc * vec3(0.22, 0.28, 0.40), limbalRing * 0.6);

    // PUPILLARY RUFF (iris-7's key eye cue): the bright wavy crinkle ring hugging the pupil edge.
    // Its scallops sharpen with crest; treble makes it glint. Warm-gold to match the inner stroma.
    float ruffR = pupilRad * 1.5 + 0.018*sin(ang*26.0);
    float ruffWave = pow(0.5 + 0.5*sin(ang*26.0), mix(1.0, 3.0, crest));   // scallops crisper on peaky audio
    float ruff = smoothstep(0.022, 0.0, abs(er - ruffR)) * irisMask * (0.6 + 0.4*ruffWave);
    outc += vec3(1.0, 0.82, 0.45) * ruff * (0.20 + trebleNormalized*0.25*REACT);

    // airglow rim: radius from spectralROLLOFF, shimmer from treble (norm + zScore).
    float rimR = mix(0.50, 0.54, rolloff) + TREND*0.03;   // TREND: rim breathes outward on a build
    // treble lights the rim with a small ALWAYS-ON baseline (lives even at REACT=0); REACT adds punch.
    float airglow = exp(-pow((er - rimR)*9.0, 2.0)) * (0.07 + trebleNormalized*0.06 + (max(trebleZScore,0.0)*0.10 + trebleNormalized*0.10)*REACT + max(TREND,0.0)*0.10);
    outc += vec3(0.15, 0.45, 0.60) * airglow;

    // catchlight: bass glint, sharpened by spectralCREST (spiky spectrum -> tighter highlight).
    vec2 clp = ec - vec2(-0.09, 0.11);
    float catchSharp = mix(0.030, 0.020, crest);
    float catchCore = 1.0 - smoothstep(0.012, catchSharp, length(clp));
    float catchGlow = exp(-pow(length(clp)*22.0, 2.0)) * 0.4;
    float catch = (catchCore + catchGlow)
                * smoothstep(0.46, 0.26, er)
                * (0.75 + bassNormalized*0.6*REACT);
    outc += vec3(0.85, 0.88, 0.98) * catch;

    // ===== PUPIL TUNNEL — concentric rings receding INTO the pupil (depth into the eye). =====
    // 1/er compresses the rings toward the centre (perspective), they rush inward on iTime and
    // spiral with ang. bass deepens the tunnel. Lives only inside the pupil.
    float pr = max(er, 0.012);
    float tunnel = 0.5 + 0.5*sin(1.0/pr*5.0 - iTime*1.5 + ang*3.0);
    tunnel = pow(tunnel, 2.0) * (1.0 - pupil);
    outc += c * vec3(0.85, 0.32, 0.16) * tunnel * (0.22 + bassNormalized*0.45*REACT);

    // ===== FRACTAL TENDRILS — curling arms radiating around the eye, filling the FULL FRAME. =====
    // The moiré field c spans the whole frame; out here (beyond the iris) we carve it into spiralling
    // radial arms that CURL with the music (twist from flux+energy) and fade toward the corners.
    float twist = 2.0 + spectralFluxNormalized*5.0*REACT + energyNormalized*2.0;   // curl amount from music
    float armN  = 7.0 + floor(spread*10.0);                                        // arm count from harmonic spread
    float curl  = ang*armN + er*twist*6.2832 - iTime*(0.4 + energyNormalized*0.8); // arms spiral outward + rotate
    float arms  = pow(0.5 + 0.5*sin(curl), 3.0);                                   // sharp distinct tendrils
    float arms2 = pow(0.5 + 0.5*sin(curl*0.5 + 1.7), 2.0);                         // 2nd octave (fractal layering)
    float tendril  = mix(arms, arms*arms2, 0.6);
    float tendZone = smoothstep(0.46, 0.56, er) * exp(-(er - 0.46)*2.2);           // outside iris, fade to corners
    outc += (c*1.5 + vec3(0.10, 0.16, 0.26)) * tendril * tendZone * (0.5 + bassNormalized*0.8*REACT);

    // TEMPORAL SMOOTHING — frame-blend kills per-frame moiré flicker AND low-passes the audio
    // reactions so they read as breathing. knob_13 = anti-flicker strength.
    vec2 uvp = U / R;
    vec3 prevF = getLastFrameColor(uvp).rgb;
    float fb = mix(0.55, 0.18, knob_13);
    outc = mix(prevF, outc, fb);
    C = vec4(clamp(outc, 0.0, 1.0), 1);
}
