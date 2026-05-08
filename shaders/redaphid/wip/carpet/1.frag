

vec2 triangle_wave(vec2 a){
  vec2 a2=
  vec2(1.,.5)
  ,
  a1=a+a2;
  return abs(fract((a1)*(a2.x+a2.y))-.5);
}

float scale=1.5;

void transform(inout vec2 uv,inout vec2 t2){
  t2=triangle_wave(uv+.5);
  uv=
  t2-triangle_wave(uv.yx)-fract(t2/2.)
  ;
}

vec2 rotate(vec2 v,float a){
  float s=sin(a);
  float c=cos(a);
  mat2 m=mat2(c,s,-s,c);
  return m*v;
}

vec3 fractal(vec2 uv){
  vec3 col=vec3(0.);
  vec2 t2=vec2(0.);
  vec3 col1=col;
  float c1=0.;
  for(int k=0;k<6+int(energyNormalized*4.0+spectralFluxZScore*2.0);k++){
    float warp_scale=3.0 + energyNormalized*4.0 + spectralFluxZScore*2.0 + spectralEntropyNormalized*3.0;
    vec2 warp=
    //abs(.5-fract(uv*3.))*3.
    //abs(.5-fract(t2*3.))*3.
    vec2(sin((t2.x)*warp_scale),cos((t2.y)*warp_scale))
    //vec2(sin((uv.x)*warp_scale),cos((uv.y)*warp_scale))
    ;
    uv.y-=1./4.;

    uv=(uv+t2)/scale;

    uv=(fract(vec2(uv+vec2(.5,1.5))*scale)-.5)/scale;
    col.x=
    max(length(uv-t2-c1)/3.,col.x);

    ;
    if(k>1)
    warp=warp*warp/warp_scale;
    else
    warp=vec2(0);

    vec2 uv_1=
    uv+warp.yx
    ,
    t2_1=
    t2+warp.yx
    ;
    vec3 col_1=col;
    transform(uv,t2);

    transform(uv_1,t2_1);
    //uv_1 = rotate(uv_1,t2.x*2.);
    //t2_1 = rotate(t2_1,t2.x*2.);

    c1=
    max(abs(uv_1.y+uv_1.x)/2.,c1)
    //max(abs(uv_1.y-uv_1.x),c1)
    ;
    c1=
    max(1.-abs(2.*c1-1.),c1/4.)
    ;
    if(beat)c1*=1.18;
    col.x=
    max(length(uv_1-t2_1-c1)/3.,col.x)

    ;
    col=
    abs(col-(1.-(c1*col.x)));
    col1=
    abs(col1*c1-col-1.).yzx;
  }
  return col1;
}

uniform float knob_1;
uniform float knob_2;
uniform float knob_3;
uniform float knob_4;
uniform float knob_5;
uniform float knob_6;

void mainImage(out vec4 fragColor,in vec2 fragCoord){
  scale = mix(1.2, 2.0, knob_6); // knob_6 = fractal scale (recursion shape)
  vec2 uv=(fragCoord.xy/resolution.xy)/2.;
  //rotate uv over time
  uv=rotate(uv,time*.1*(knob_5*2.0)); // knob_5 = rotation speed (0=still, 0.5=normal, 1=2x)
  // knob_3 = zoom (centered 0.5; <0.5 out, >0.5 in)
  float zoom = exp((knob_3 - 0.5) * 3.0);
  uv /= zoom;
  // knob_1 = X pan, knob_2 = Y pan (centered at 0.5)
  uv += vec2((knob_1-0.5)*2.0, (knob_2-0.5)*2.0);
  // CENTROID-DRIVEN TWIST — warps the fractal field. Brighter (high centroid) = more twist.
  // Twist amount also scales with mids (vocal/melody dominance). Pure spatial complexity.
  float twistAmt = (spectralCentroidNormalized - 0.3) * (0.5 + midsNormalized*1.2);
  float radius = length(uv);
  uv = rotate(uv, twistAmt * smoothstep(0.0, 0.6, radius));
  vec3 col1=fractal(uv);

  // OKLAB darkwave palette — perceptual interpolation, deep purples / blood / ice / black
  // Tame fractal output; col1 can exceed 1.0 from loop accumulation
  float lum = clamp(dot(col1, vec3(0.3,0.59,0.11))*0.5, 0.0, 1.0);
  // Hue angle: position-rich so carpet shows multi-hue bands, not monochrome
  // length(uv)*2.5 + atan2 → rings + radial bands across screen
  float hueAng = time*0.06
               + length(uv)*5.0
               + atan(uv.y, uv.x)*1.5
               + lum*6.0
               + midsNormalized*2.0
               + pitchClassNormalized*1.6  // each note shifts the palette identity
               + knob_4*6.2831;
  // DROP FLASH — sudden energy spikes briefly desaturate + lift L (struck-match feel)
  float drop = smoothstep(0.3, 0.8, energyZScore);
  // Chroma: rich darkwave base, treble shimmer, entropy CHAOS BOOST; drop momentarily desaturates
  float entropyKick = smoothstep(0.5, 0.9, spectralEntropyNormalized) * 0.12;
  float chroma = (0.11 + trebleNormalized*0.08 + entropyKick + bassNormalized*0.04 + abs(spectralFluxZScore)*0.04) * (1.0 - drop*0.5);
  // Lightness: visible darkwave baseline, bass pump, structural lum. Capped below white for mood.
  // Drop adds a subtle L lift on top.
  float L = clamp(0.28 + bassZScore*0.18 + lum*0.30 + energyNormalized*0.08 + drop*0.18, 0.12, 0.78);
  vec3 lab = vec3(L, chroma*cos(hueAng), chroma*sin(hueAng));
  vec3 rgb = oklab2rgb(lab);

  // FRAME FEEDBACK ECHO — darkwave time-trail with TREBLE-DRIVEN CHROMATIC ABERRATION.
  // Bass intensifies trail bloom; treble spikes split the echo into R/G/B offsets (glitch).
  vec2 fc = fragCoord.xy / resolution.xy;
  vec2 echoUv = (fc - 0.5) * (0.985 - bassNormalized*0.012) + 0.5;
  // Aberration vector — radial outward, scaled by trebleZScore (bursts on hi-freq hits)
  float aberration = max(trebleZScore, 0.0) * 0.012 + trebleNormalized * 0.003;
  vec2 dir = normalize(fc - 0.5 + 1e-6);
  float r = texture(prevFrame, echoUv + dir * aberration).r;
  float g = texture(prevFrame, echoUv).g;
  float b = texture(prevFrame, echoUv - dir * aberration).b;
  vec3 echo = vec3(r, g, b) * (0.78 + bassNormalized*0.10);
  rgb = max(rgb, echo); // max-blend keeps trail bright without runaway accumulation

  // BREATHING MIST — soft additive glow that fills the void when bass is silent.
  // Inverse-coupled: fades out when bass kicks (yields the moment to other reactive elements).
  float breath = sin(time*0.4) * 0.5 + 0.5;
  float voidness = 1.0 - bassNormalized;
  float mistRadial = 1.0 - smoothstep(0.0, 0.7, length(fc - 0.5));
  float mist = breath * voidness * mistRadial * 0.10;
  // Tint mist with current oklab hue family (subtle complement to scene)
  vec3 mistColor = oklab2rgb(vec3(0.5, 0.05*cos(hueAng+1.5), 0.05*sin(hueAng+1.5)));
  rgb += mistColor * mist;

  // FILM GRAIN — roughness-driven noise. Darkwave atmospheric grit.
  // Hash-based per-pixel noise, intensity scales with spectralRoughness.
  vec2 grainSeed = fragCoord.xy + vec2(time*97.13, time*47.7);
  float grain = fract(sin(dot(grainSeed, vec2(12.9898,78.233))) * 43758.5453) - 0.5;
  // Amplify in dark areas (where grain reads strongest in darkwave) + scale by roughness
  float darkness = 1.0 - dot(rgb, vec3(0.333));
  rgb += grain * spectralRoughnessNormalized * darkness * 0.10;

  fragColor=vec4(rgb,1.);
}

