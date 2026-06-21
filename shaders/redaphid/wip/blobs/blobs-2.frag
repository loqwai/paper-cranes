// @fullscreen: true
// @mobile: true
// @tags: metaballs, blobs, spectral, oklch
// blobs-2 — fully AUDIO-REACTIVE (autonomous mode, 2026-06-07). Former knob controls are
// now driven by SLOW spectral stats so the look evolves with the music while unattended.
uniform float blobMotion;
uniform float mirrorRot;
uniform float mirrorTile;
#define TREND_GAIN 2000.0
#define BRIGHT_TREND  (clamp(spectralCentroidSlope * TREND_GAIN, -1.0, 1.0) * spectralCentroidRSquared)
#define CHAOS_TREND   (clamp(spectralEntropySlope  * TREND_GAIN, -1.0, 1.0) * spectralEntropyRSquared)
#define WIDTH_TREND   (clamp(spectralSpreadSlope   * TREND_GAIN, -1.0, 1.0) * spectralSpreadRSquared)
#define ROLLOFF_TREND (clamp(spectralRolloffSlope  * TREND_GAIN, -1.0, 1.0) * spectralRolloffRSquared)
#define BLOB_K    (0.4 + CHAOS_TREND * 0.4)
#define SPREAD    (1.0 + WIDTH_TREND * 0.5 + (spectralSpreadMean - 0.3) * 0.9)
#define FOG       (0.15 - ROLLOFF_TREND * 0.06 + (1.0 - spectralCentroidMean) * 0.12)
#define CORE_HUE   0.6
#define CORONA_HUE 4.2
#define CREST_VIVID (spectralCrestNormalized)
#define ROUGH_RIM   (spectralRoughnessNormalized)
#define FOCUS       (spectralKurtosisNormalized)
#define AIRGLOW     (spectralCentroidMean)
#define SLOW_HUE    (pitchClassMean * 5.0 + (spectralCentroidMean - 0.3) * 0.6)
#define HUE_EXTRA   ((spectralRolloffMean - 0.3) * 1.0)
#define MIRROR_AMT  (0.25 + spectralEntropyMean * 0.6)
#define EXPOSURE    (0.9 + spectralCentroidMean * 0.4)
#define COUNT       (8.0 + spectralEntropyMean * 8.0)
#define CHROMA_AUD  (clamp(spectralCrestMean, 0.0, 2.0) * 0.03)
#define COLOR_GLIDE (0.4 + spectralSpreadMean * 1.5)
#define PAL_HUE     (CORE_HUE + SLOW_HUE + HUE_EXTRA)
float opSmoothUnion( float d1, float d2, float k ){ float h = clamp( 0.5 + 0.5*(d2-d1)/k, 0.0, 1.0 ); return mix( d2, d1, h ) - k*h*(1.0-h); }
float sdSphere( vec3 p, float s ){ return length(p)-s; }
float map(vec3 p){
	float bm = blobMotion > 0.0001 ? blobMotion : iTime;
	float d = 2.0;
	for (int i = 0; i < 16; i++) {
		if (float(i) >= COUNT) break;
		float fi = float(i);
		float time = bm * (fract(fi * 412.531 + 0.513) - 0.5) * 2.0;
		d = opSmoothUnion(sdSphere(p + sin(time + fi * vec3(52.5126, 64.62744, 632.25)) * vec3(2.0, 2.0, 0.8) * SPREAD, mix(0.5, 1.0, fract(fi * 412.531 + 0.5124))), d, BLOB_K);
	}
	return d;
}
vec3 calcNormal( in vec3 p ){ const float h = 1e-5; const vec2 k = vec2(1,-1); return normalize( k.xyy*map( p + k.xyy*h ) + k.yyx*map( p + k.yyx*h ) + k.yxy*map( p + k.yxy*h ) + k.xxx*map( p + k.xxx*h ) ); }
void mainImage( out vec4 fragColor, in vec2 fragCoord ){
    vec2 uv = fragCoord/iResolution.xy;
	vec3 rayOri = vec3((uv - 0.5) * vec2(iResolution.x/iResolution.y, 1.0) * 6.0, 3.0);
	vec3 rayDir = vec3(0.0, 0.0, -1.0);
	float depth = 0.0;
	vec3 p;
	float dist = 1e9;
	float closest = 1e9;
	for(int i = 0; i < 64; i++) { p = rayOri + rayDir * depth; dist = map(p); closest = min(closest, dist); depth += dist; if (dist < 1e-6) break; }
	bool hit = dist < 1e-3;
    depth = min(6.0, depth);
	vec3 n = calcNormal(p);
    vec3 lightDir = normalize(vec3(0.4, 0.7, 0.6));
    float b = max(0.0, dot(n, lightDir));
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    float fres = pow(1.0 - max(0.0, dot(n, viewDir)), 2.0);
    float corona = clamp(smoothstep(0.1, 0.85, fres) + (1.0 - b) * 0.18, 0.0, 1.0);
    float flow = n.x * 0.6 + n.y * 0.45 + 0.3 * sin(p.z * 0.8 + p.x * 0.5);
    float hue  = CORE_HUE + (spectralSkewMean - 0.5) * 0.4 + SLOW_HUE + HUE_EXTRA + flow * COLOR_GLIDE + corona * 0.5;
    float L    = 0.45 + 0.30 * b + AIRGLOW * 0.07;
    float C    = (0.15 + 0.06 * CREST_VIVID) - 0.03 * corona + CHROMA_AUD;
    vec3  col  = oklch2rgb(vec3(L, C, hue));
    float halo    = mix(0.55, 0.18, FOCUS);
    float rimGlow = pow(fres, mix(1.0, 2.2, FOCUS)) + pow(fres, 0.5) * halo;
    vec3  rimCol  = oklch2rgb(vec3(0.85, 0.12, hue + 0.45 + fres * 0.9 + corona * 0.5));
    col += rimCol * rimGlow * (0.28 + 0.30 * b) * (0.7 + 0.5 * ROUGH_RIM);
    // glossy specular glint — kurtosis sharpens it (peaked=pinpoint, diffuse=broad sheen),
    // roughness dulls it. Gives the orbs a wet/glassy, dimensional read.
    float specPow = mix(12.0, 55.0, FOCUS);
    float spec = pow(max(0.0, dot(reflect(-lightDir, n), viewDir)), specPow);
    col += spec * (0.32 - 0.12 * ROUGH_RIM) * oklch2rgb(vec3(0.95, 0.05, hue + 0.2));
    col *= exp( -depth * FOG );
    float horizon = smoothstep(-0.1, 0.65, uv.y);
    vec3 voidCol = oklch2rgb(vec3(0.05 + 0.10 * (1.0 - horizon), 0.05, CORONA_HUE - 0.4 + SLOW_HUE * 0.3));
    col = hit ? col : voidCol;
    float aura = exp(-closest * 1.7);
    vec3  auraCol = oklch2rgb(vec3(0.50, 0.11, PAL_HUE));
    if (!hit) col += auraCol * aura * 0.55;
    col = pow(clamp(col, 0.0, 1.0), vec3(0.82));
    float tile = 2.6;
    vec2  g    = (uv - 0.5) * tile + 0.5;
    vec2  cell = floor(g);
    vec2  lc   = fract(g) - 0.5;
    float hcell = fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);
    if (mod(cell.x + cell.y, 2.0) > 0.5) lc.x = -lc.x;
    if (hcell > 0.5) lc.y = -lc.y;
    vec3  prev = getLastFrameColor(clamp(lc + 0.5, 0.001, 0.999)).rgb;
    float edgeFade = smoothstep(0.5, 0.28, max(abs(lc.x), abs(lc.y)));
    float depthDim = mix(0.14, 0.50, hcell);
    vec3  mirror = prev * depthDim * edgeFade * MIRROR_AMT;
    float primaryLum = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(mirror, col, smoothstep(0.03, 0.20, primaryLum));
    col = clamp(col * EXPOSURE, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}