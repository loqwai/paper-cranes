// @fullscreen: true
// @mobile: false
// License: CC0
//  Seed: ShaderToy golden-dodecahedron kaleidoscope, recolored to plasma-event-horizon Oklch.
//  PROGRESSION model: audio-driven MOTION reads monotonic phases from the dodeca-bloom
//  controller (spin/morph/flow/hue) so it evolves forward, never snaps. Audio LEVELS map by
//  family to fractal REGIONS (bass=core, mids=arms, treble=tips). BLACK background.
//  Backbuffer feedback gives the arms luminous spiral trails. Knobs 7-11 explore the shape.
//  Requires: ?controller=dodeca-bloom

const float baseSize = 0.75;
const float baseOffc = 1.05;
const float width = 0.0125;
const int   rep   = 15 ;

#define PHI   (.5*(1.+sqrt(5.)))
#define PI    3.141592654
#define TAU   (2.0*PI)
#define TTIME (TAU*iTime)

// === Controller-provided uniforms ===
uniform float spin_angle;    // rotation phase (monotonic) — knob_5 speed
uniform float morph_phase;   // geometry evolution (monotonic)
uniform float flow_phase;    // ripple flow (monotonic)
uniform float hue_phase;     // palette journey (monotonic)
uniform float bass_env;      // slow bass level
uniform float mids_env;      // slow mids level
uniform float treble_env;    // slow treble level
uniform float energy_env;
uniform float entropy_env;
uniform float centroid_env;
uniform float bass_pump;     // FAST bass envelope — low-end punch (bass music)
uniform float drop_glow;     // sustained drop bloom — knob_6 sustain
uniform float pitch_pulse;   // melodic-jump flash

// === Knobs ===
#define ZOOM        (0.35 + knob_1 * 2.65)               // knob_1 ZOOM
#define MASTER_HUE  (knob_2 * 6.28318)                   // knob_2 palette hue
#define LINE_THICK  (width * (5.0 + energy_env * 5.0) * (0.4 + knob_12 * 1.6))  // knob_12 line weight (moved from k3)
#define RIPPLE_FREQ (10.0 + knob_13 * 16.0)              // knob_13 ripple density (moved from k4)
// COLOR MIX (iq-style, driven by the fractal SDF): knob_2 = hue base, knob_3 = hue frequency, knob_4 = chroma
// fractal exploration:
#define size  (baseSize * mix(0.55, 1.10, knob_7))       // knob_7 facet size
#define offc  (baseOffc * mix(0.70, 1.45, knob_8))       // knob_8 arm spread
#define DEPTH (mix(0.18, 0.50, knob_9))                  // knob_9 depth slice
#define TWIST (knob_10 * 3.14159)                        // knob_10 kaleido twist
#define BASS_REACT (0.8 + knob_11 * 1.4)                 // knob_11 bass reactivity amount

// brightness (smoothed levels — never flicker)
#define IRIDESCENCE (0.7 + 0.6 * entropy_env)
#define EDGE_GLOW   (0.9 + 0.4 * energy_env)

// plasma palette — Oklch hue in radians
#define CORE_HUE   0.6
#define CORONA_HUE 4.2

const vec3 plnormal = normalize(vec3(1, 1, -1));
const vec3 n1 = normalize(vec3(-PHI,PHI-1.0,1.0));
const vec3 n2 = normalize(vec3(1.0,-PHI,PHI+1.0));
const vec3 n3 = normalize(vec3(0.0,0.0,-1.0));

float pmin(float a, float b, float k) {
  float h = clamp( 0.5+0.5*(b-a)/k, 0.0, 1.0 );
  return mix( b, a, h ) - k*h*(1.0-h);
}

float dodec(in vec3 z) {
  vec3 p = z;
  float t;
  z = abs(z);
  t=dot(z,n1); if (t>0.0) { z-=2.0*t*n1; }
  t=dot(z,n2); if (t>0.0) { z-=2.0*t*n2; }
  z = abs(z);
  t=dot(z,n1); if (t>0.0) { z-=2.0*t*n1; }
  t=dot(z,n2); if (t>0.0) { z-=2.0*t*n2; }
  z = abs(z);

  float dmin=dot(z-vec3(size,0.,0.),plnormal);
  // stable ripple frequency; PHASE flows forward via flow_phase (no crawl/snap)
  dmin = abs(dmin) - LINE_THICK*(0.55 + 0.45*sin(RIPPLE_FREQ*length(p) - 0.5*p.y + flow_phase));
  return dmin;
}

void rot(inout vec2 p, float a) {
  float c = cos(a);
  float s = sin(a);
  p = vec2(c*p.x + s*p.y, -s*p.x + c*p.y);
}

float df(vec2 p) {
  float d = 100000.0;
  float off = DEPTH + 0.22*sin(morph_phase) + bass_pump * BASS_REACT * 0.06;  // bass blooms the core depth
  for (int i = 0; i < rep; ++i) {
    vec2 ip = p;
    rot(ip, float(i)*TAU/float(rep) + TWIST);    // kaleido base orientation + knob_10 twist
    ip -= vec2(offc*size, 0.0);
    vec2 cp = ip;
    rot(ip, spin_angle);                         // continuous monotonic spin
    float dd = dodec(vec3(ip, off*size));
    float cd = length(cp - vec2(0.2*sin(morph_phase*0.7), 0.0)) - 0.125*size;
    cd = abs(cd) - width*0.5;
    d = pmin(d, dd, 0.05);
    d = pmin(d, cd, 0.025);
  }
  return d;
}

vec3 postProcess(vec3 col, vec2 q, vec2 p) {
  col=pow(clamp(col,0.0,1.0),vec3(0.75));
  col=col*0.6+0.4*col*col*(3.0-2.0*col);  // contrast
  col=mix(col, vec3(dot(col, vec3(0.33))), -0.4);  // saturation
  const float r = 1.5;
  float d = max(r - length(p), 0.0)/r;
  col *= vec3(1.0 - 0.25*exp(-200.0*d*d));  // edge vignette
  return col;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 q = fragCoord.xy / iResolution.xy;
  vec2 p = 2.0*(q - 0.5);
  p.x *= iResolution.x/iResolution.y;
  p *= ZOOM * (1.0 - bass_pump * BASS_REACT * 0.12);   // bass ZOOM PUNCH — sub hits push in
  float d = df(p);

  float fuzzy = 0.0025;
  float edges = smoothstep(fuzzy, -fuzzy, d);
  vec3 rgb = 0.5 + 0.5*vec3(sin(TAU*vec3(50.0, 49.0, 48.0)*(d - 0.050) + flow_phase*0.6));
  float bands = pow(clamp(dot(rgb, vec3(0.34)), 0.0, 1.0), 8.0);
  float falloff = 1.0 - tanh(0.05 + abs(8.0*d));
  float wave = sin(TAU/4.0*(-length(p) - 0.5*p.y) + morph_phase*0.8);
  float fwave = 0.5 + 0.5*sign(wave)*pow(abs(wave), 0.75);

  // structure: falloff drives it to 0 away from the lines -> the void is BLACK.
  float structure = (EDGE_GLOW*edges + IRIDESCENCE*bands) * falloff;
  structure *= mix(1.0, fwave, 0.22);   // radial wave SHADES the structure; never lights the void

  // feature FAMILY -> fractal REGION: bass=core (pumped), mids=arms, treble=tips
  float rr = length((q - 0.5) * vec2(iResolution.x/iResolution.y, 1.0));
  float coreW = smoothstep(0.34, 0.0, rr);
  float tipW  = smoothstep(0.22, 0.62, rr);
  float armW  = clamp(1.0 - coreW - tipW, 0.0, 1.0);
  float bassDrive = clamp(bass_env + bass_pump * BASS_REACT, 0.0, 1.6);
  float regionGlow = bassDrive*coreW + mids_env*armW + treble_env*tipW;

  // EVERYTHING multiplies the structure -> void is ALWAYS 0 -> ZERO background activity.
  // drops + pitch brighten ONLY where structure already exists.
  float intensity = clamp(structure * (0.55 + 0.9*regionGlow) * (1.0 + drop_glow*0.9 + pitch_pulse*0.6), 0.0, 1.0);

  // iq-style PROCEDURAL palette in Oklch — vivid (high chroma), varied across the fractal,
  // journeying continuously via hue_phase. t spans the field + radius + slow time.
  // === GREEN IRIS (developing slowly) — anatomical color, SDF reads as stroma fibers ===
  // Green eyes = low-melanin blue scatter + yellow lipochrome ("fat deposits"), with
  // CENTRAL HETEROCHROMIA: amber/gold near the pupil -> green toward the limbus.
  float irisR = rr;                                    // 0 = pupil, ~0.7 = limbus
  float GOLD  = 1.40;                                  // amber lipochrome (oklch hue, radians)
  float GREEN = 2.45;                                  // iris green
  float baseHue = mix(GOLD, GREEN, smoothstep(0.04, 0.45, irisR));
  float fiber = d * mix(10.0, 46.0, knob_3);           // SDF -> radial stroma fiber detail (knob_3 density)
  float hue = baseHue + 0.22*sin(TAU*fiber) + (knob_2 - 0.5)*0.9;   // fiber hue jitter + knob_2 nudge
  float C   = mix(0.07, 0.20, knob_4) * (0.82 + 0.18*cos(TAU*fiber)); // knob_4 chroma; gold flecks at peaks
  float L   = clamp(intensity * 0.80, 0.0, 0.95);
  // STEP 2 — LIMBAL RING: deep blue-grey darkening at the iris rim (the dark outer ring of real irises)
  float limbal = smoothstep(0.40, 0.56, irisR);
  hue = mix(hue, 4.1, limbal*0.55);                   // cool the rim toward blue-grey
  C  *= (1.0 - 0.35*limbal);                          // desaturate the ring
  L  *= (1.0 - 0.55*limbal);                          // darken -> the limbal ring
  // STEP 3 — COLLARETTE: crenelated ridge ~1/3 out, dividing pupillary (inner) & ciliary (outer) zones.
  // integer-multiple angle (rep) keeps the zigzag seamless across the atan2 wrap.
  float collR = 0.20 + 0.02*sin(atan(p.y, p.x)*float(rep));
  float collarette = smoothstep(0.045, 0.0, abs(irisR - collR));
  L *= (1.0 + collarette*0.5);                         // raised, lighter ridge ring
  C *= (1.0 + collarette*0.25);                        // a touch richer along the collarette
  // STEP 4 — CRYPTS OF FUCHS: dark oval pits in a ring just outside the collarette
  // (stroma thins -> dark epithelium shows). 12 angular pits (integer -> seamless).
  float aa = atan(p.y, p.x);
  float pitAng = pow(0.5 + 0.5*cos(aa*12.0), 8.0);     // sharp angular dots
  float pitRad = smoothstep(0.07, 0.0, abs(irisR - 0.27)); // band outside the collarette
  float crypts = pitAng * pitRad;
  L *= (1.0 - 0.70*crypts);                            // dark pits
  C *= (1.0 - 0.30*crypts);
  // STEP 5 — CONTRACTION FURROWS: fine concentric folds in the outer ciliary zone
  float furrowZone = smoothstep(0.30, 0.40, irisR) * smoothstep(0.56, 0.46, irisR);
  float furrows = 0.5 + 0.5*sin(irisR * 150.0);        // concentric rings
  L *= (1.0 + (furrows - 0.5) * 0.30 * furrowZone);    // subtle light/dark circumferential folds
  vec3 col  = oklch2rgb(vec3(L, C, hue));

  col = postProcess(col, q, p);

  // === Infinity mirror (Subtronics-2 style): recursive zoom feedback receding into center ===
  vec2 CEN = vec2(0.5);
  float zoomF = 1.05 + bass_pump * BASS_REACT * 0.10;   // bass deepens / speeds the tunnel
  float mrot = 0.02;                                     // gentle spiral with the spin
  vec2 ruv = q - CEN;
  ruv = mat2(cos(mrot), -sin(mrot), sin(mrot), cos(mrot)) * ruv;
  ruv = ruv * zoomF + CEN;
  vec3 mirror = getLastFrameColor(ruv).rgb;
  col = max(col, mirror * 0.74);                         // recede + fade; lower decay -> fresh varied color shows through

  fragColor = vec4(col, 1.0);
}
