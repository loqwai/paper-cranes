//https://visuals.beadfamous.com/edit?knob_1=0.134&knob_1.min=0&knob_1.max=1&knob_0=0.575&knob_0.min=0&knob_0.max=1&knob_2=0&knob_2.min=0&knob_2.max=1&knob_3=0.488&knob_3.min=0&knob_3.max=1&knob_4=1&knob_4.min=0&knob_4.max=1&knob_5=0.984&knob_5.min=0&knob_5.max=1&knob_6=0&knob_6.min=0&knob_6.max=1&knob_7=0&knob_7.min=0&knob_7.max=1&knob_8=0.055&knob_8.min=0&knob_8.max=1&knob_9=0&knob_9.min=0&knob_9.max=1&knob_10=0.394&knob_10.min=0&knob_10.max=1&knob_11=0&knob_11.min=0&knob_11.max=1&knob_15=0.346&knob_15.min=0&knob_15.max=1&knob_14=0.362&knob_14.min=0&knob_14.max=1&knob_13=0.197&knob_13.min=0&knob_13.max=1&knob_12=0.079&knob_12.min=0&knob_12.max=1&knob_16=0.276&knob_16.min=0&knob_16.max=1&knob_17=1&knob_17.min=0&knob_17.max=1&knob_18=0&knob_18.min=0&knob_18.max=1&knob_19=0&knob_19.min=0&knob_19.max=1&knob_23=0.407&knob_23.min=0&knob_23.max=1&knob_22=0&knob_22.min=0&knob_22.max=1&knob_21=0.992&knob_21.min=0&knob_21.max=1&knob_20=0.039&knob_20.min=0&knob_20.max=1&knob_24=0.46&knob_24.min=0&knob_24.max=1&knob_25=0.087&knob_25.min=0&knob_25.max=1&knob_26=0.465&knob_26.min=0&knob_26.max=1&knob_30=0&knob_30.min=0&knob_30.max=1&knob_29=0.945&knob_29.min=0&knob_29.max=1&knob_27=0.433&knob_27.min=0&knob_27.max=1&knob_31=0&knob_31.min=0&knob_31.max=1&knob_45=0.528&knob_45.min=0&knob_45.max=1&knob_32=0.48&knob_32.min=0&knob_32.max=1&knob_33=0&knob_33.min=0&knob_33.max=1&knob_34=0.543&knob_34.min=0&knob_34.max=1&knob_35=0.346&knob_35.min=0&knob_35.max=1&knob_38=1&knob_38.min=0&knob_38.max=1&knob_36=0.283&knob_36.min=0&knob_36.max=1&knob_40=0.18&knob_40.min=0&knob_40.max=1&knob_41=0.42&knob_41.min=0&knob_41.max=1&knob_42=0.441&knob_42.min=0&knob_42.max=1&knob_43=0.606&knob_43.min=0&knob_43.max=1&knob_47=0.354&knob_47.min=0&knob_47.max=1&knob_46=0.039&knob_46.min=0&knob_46.max=1&knob_44=0.772&knob_44.min=0&knob_44.max=1&knob_28=0&knob_28.min=0&knob_28.max=1&knob_37=0.961&knob_37.min=0&knob_37.max=1&knob_39=0.609&knob_39.min=0&knob_39.max=1&knob_58=0.307&knob_58.min=0&knob_58.max=1&knob_59=1&knob_59.min=0&knob_59.max=1&knob_48=0.87&knob_48.min=0&knob_48.max=1&knob_53=0.614&knob_53.min=0&knob_53.max=1

////////////////////////////////////////////////////////////////////////////////
//  Optimized & Readable                                                    ////
//  – invariants hoisted from loops                                         ////
//  – redundant sin/cos calls removed                                       ////
//  – common sub-expressions cached                                         ////
//  – branching minimized, early-outs kept                                  ////
//  – comments trimmed to essentials                                        ////
//  See general GLSL perf tips on hoisting invariant work and trigonometric //
//  cost for reference. :contentReference[oaicite:0]{index=0}                     //
////////////////////////////////////////////////////////////////////////////////


// ────────────────────────  Knob Macros 1-38  ────────────────────────────────
#define TIME_SCALE       (0.5 + knob_19 * 2.0)
#define SPIRAL_ANGLE     (0.6 + knob_20 * 1.5)
#define FREQ_BOOST       (1.0 + knob_21 * 3.0)
#define KALEIDO_SEGMENT  (mix(3.0, 24.0, knob_22))
#define FRACTAL_WARP     (knob_23 * 0.5)
#define CELL_JITTER      (0.5 + knob_24 * 1.5)
#define SAT_BOOST        (1.0 + knob_25 * 0.5)
#define LIT_BOOST        (1.0 + knob_26 * 0.5)
#define TRAIL_MIX        (mix(0.02, 0.5, knob_27))
#define EXTRA_HUE_SHIFT  (knob_28 * 0.5)
#define STROBE_SPEED     (2.0 + knob_29 * 20.0)
#define DARKEN_STRENGTH  (knob_30 * 0.8)
#define EDGE_STRENGTH    (knob_31 * 0.5)
#define GROUPING_MULT    (0.5 + knob_32 * 2.0)
#define PHEROMONE_MULT   (0.2 + knob_33 * 2.0)
#define METAB_MULT       (0.2 + knob_34 * 2.0)
#define HUNGER_MULT      (0.2 + knob_35 * 2.0)
#define HUEVAR_MULT      (0.2 + knob_36 * 2.0)
#define NOISE_MULT       (mix(0.5, 3.0, knob_37))
#define FRACTAL_MIX      (knob_38 * 0.5)
//  ───────────────────────────────────────────────────────────────────────────

#define TWO_PI 6.28318530718

// ─────────────────────── Helpers ───────────────────────────────────────────
mat2 rot(float a){ float s=sin(a), c=cos(a); return mat2(c,-s,s,c); }

float spiralNoise(vec2 p){
    // Pre-compute rotation matrix & time delta once
    mat2 R = rot(SPIRAL_ANGLE);
    float dt = time * 0.04 * TIME_SCALE;
    float a = 0.0, f = 2.0 * FREQ_BOOST;
    for(int i=0;i<10;i++){
        a += abs(sin(p.x*f)+cos(p.y*f))/f;
        p  = R*p + dt;
        f *= (1.95 + knob_21*2.0);
    }
    return a;
}

float simpleNoise(vec2 p){
    float offMag = (1./1000.)*(0.5+knob_24);
    vec2 jitter  = vec2(random(p))*offMag - offMag*.5;
    return spiralNoise(p + jitter);
}

float fbm(vec2 p){
    float sum=0., amp=.5;
    for(int i=0;i<5;i++){
        sum += amp * simpleNoise(p);
        p   *= 2.01;
        amp *= .5;
    }
    return sum;
}

vec2 domainWarp(vec2 p,float warp,float off){
    float n1=fbm(p-off), n2=fbm(p+3.14159-off);
    return p + warp*vec2(n1,n2);
}

float deepFractal(vec2 p){
    float amp=.5,sum=0.;
    for(int i=0;i<4;i++){
        vec2 q = domainWarp(p,(knob_11*.35+FRACTAL_WARP)*amp,time*.03*float(i));
        sum   += amp*fbm(q);
        p     *= 2.;
        amp   *= .55;
    }
    return sum + (0.25+FRACTAL_MIX)*spiralNoise(p*4.*NOISE_MULT);
}

float hash(vec2 p){ return staticRandom(p); }

float cell(vec2 p){
    vec2 i=floor(p), f=fract(p);
    float d=1.;
    for(int y=-1;y<=1;y++)
    for(int x=-1;x<=1;x++){
        vec2 g=vec2(x,y);
        vec2 o=vec2(hash(i+g),hash(i-g))*CELL_JITTER;
        d=min(d,length(f-g-o));
    }
    return d;
}

vec2 kaleido(vec2 p,float seg){
    float a=atan(p.y,p.x)+TWO_PI/seg*.5;
    float r=length(p);
    a=mod(a,TWO_PI/seg)-TWO_PI/seg*.5;
    return vec2(cos(a),sin(a))*r;
}

float varied(vec2 p,float t){
    float k=mix(3.,KALEIDO_SEGMENT,animateEaseInOutSine(t/10000.));
    vec2 q=kaleido(p,k)*NOISE_MULT;
    float a=deepFractal(q*1.2);
    float b=cell(q*4.+vec2(t*.1,0));
    float c=sin(q.x*8.+t)+cos(q.y*8.-t);
    return mix(mix(a,b,knob_1),c,knob_2);
}

// ───────────────────── Artificial-Life Constants ───────────────────────────
#define GROUPING_STRENGTH (sin(time)*spectralFlux*GROUPING_MULT)
#define HUE_VARIATION (sin(time/1000.)*HUEVAR_MULT)
#define HUNGER_DRIVE (0.01*HUNGER_MULT)
#define FEEDING_EFFICIENCY knob_15
#define METABOLISM (animateBounce(time/100.+length(centerUv(uv)))*0.2*length(vec2(lastCol.x,uv.x))*METAB_MULT)
#define SATURATION_DECAY (animateEaseInOutExpo(time)*0.15)
#define PHEROMONE_STRENGTH (knob_16*PHEROMONE_MULT)
#define BLOB_THRESHOLD (bass>0.5?.5:bass)
#define ENVIRONMENT_FOOD energy
#define HUE_DAMPING_FACTOR (0.75+knob_17*.20)
#define MAX_HUE_CHANGE 0.08

// ────────────────────────  Main  ───────────────────────────────────────────
void mainImage(out vec4 fragColor,in vec2 fragCoord){
    vec2 res=iResolution.xy, uv=fragCoord/res;
    vec2 p=(2.*fragCoord-res)/min(res.x,res.y);
    vec2 px=1./res;

    // cached previous colours / helpers
    vec3 prevRGB=getLastFrameColor(uv).rgb;
    vec3 lastCol=rgb2hsl(prevRGB);
    lastCol.z=clamp(lastCol.z+(knob_3-.5),0.,1.);
    if(lastCol.y<=.8) lastCol.y+=lastCol.z-.5;

    float t=time*(.05+.05*knob_4)*TIME_SCALE;

    // ----- Warp & pattern --------------------------------------------------
    p*=1.+knob_5*2.;
    p=domainWarp(p, knob_7*length(prevRGB), t*.1);
    p=domainWarp(p, knob_8*.3, -t*.07);
    p+=animateEaseInOutSine(t*.1+knob_9*.3)*knob_9*.3*
        vec2(sin(p.y*2.), cos(p.x*2.));

    float pattern=varied(p*mix(1.,4.,knob_10)+t*.2, t);
    pattern=mix(pattern, pattern*pattern, knob_11);

    // ----- HSL base --------------------------------------------------------
    float hue = fract(t*(.1+knob_12*.2)+EXTRA_HUE_SHIFT
                      + pattern*sin(uv.y)/cos(uv.x)
                      + (knob_1*.2+knob_4*.25+knob_7*.2)
                      + lastCol.z);
    if(knob_1>.5) hue=1.-hue;

    float sat = clamp((.8+knob_10*.2)*SAT_BOOST + knob_9*.1,0.,1.);
    float lit = clamp((.4+pattern*.3)*LIT_BOOST*(1.+knob_13)+knob_1*.1,0.,1.);
    lit *= mix(1.,1.2, sin(time*STROBE_SPEED)*.5+.5);

    vec3 newColor = hsl2rgb(vec3(hue,sat,lit));
    newColor = mix(newColor,getInitialFrameColor(uv).rgb, .05*knob_14);

    // ----- Life sim  -------------------------------------------------------
    vec3 lifeHSL = rgb2hsl(newColor);
    vec3 n[4];
    n[0]=rgb2hsl(getLastFrameColor(uv+vec2(-px.x,-px.y)).rgb);
    n[1]=rgb2hsl(getLastFrameColor(uv+vec2( px.x,-px.y)).rgb);
    n[2]=rgb2hsl(getLastFrameColor(uv+vec2(-px.x, px.y)).rgb);
    n[3]=rgb2hsl(getLastFrameColor(uv+vec2( px.x, px.y)).rgb);

    lifeHSL.z-=METABOLISM;
    lifeHSL.y-=SATURATION_DECAY;

    float hunger=smoothstep(BLOB_THRESHOLD+.1,BLOB_THRESHOLD-.1,lifeHSL.z);
    float energyGain = hunger*HUNGER_DRIVE*((
        (n[0].z+n[1].z+n[2].z+n[3].z)*.25)+ENVIRONMENT_FOOD-lifeHSL.z);
    lifeHSL.z+=max(0.,energyGain);
    lifeHSL.y+=max(0.,energyGain*FEEDING_EFFICIENCY);

    // group & hue drift
    vec2 hv=vec2(0.);
    for(int i=0;i<4;i++) hv+=vec2(cos(n[i].x*TWO_PI), sin(n[i].x*TWO_PI));
    float targetHue=atan(hv.y,hv.x)/TWO_PI;
    if(abs(targetHue-lifeHSL.x)>.5) targetHue-=sign(targetHue-lifeHSL.x);
    float hueDelta=GROUPING_STRENGTH*(targetHue-lifeHSL.x)+
                   (random(uv+time)-.5)*HUE_VARIATION*(1.-hunger*.7);
    hueDelta=clamp(hueDelta,-MAX_HUE_CHANGE,MAX_HUE_CHANGE)*HUE_DAMPING_FACTOR;
    lifeHSL.x=fract(lifeHSL.x+hueDelta);

    lifeHSL.xy=clamp(lifeHSL.xy,0.,1.);
    lifeHSL.z=clamp(lifeHSL.z,0.,1.);

    // ----- Final mix & post ------------------------------------------------
    vec3 finalHSL=mix(lastCol,lifeHSL,clamp(length(uv),0.,1.));
    finalHSL.x=fract(finalHSL.x+knob_18*.05);

    while(finalHSL.z>.5){
        finalHSL.x=mix(finalHSL.x,0.,finalHSL.z);
        finalHSL.z-=.09;
        finalHSL.y=mix(finalHSL.y,.8,.5);
    }

    vec3 finalRGB=hsl2rgb(finalHSL);
    finalRGB*=1.-DARKEN_STRENGTH*length(uv);

    // edge emphasise
    vec3 grad=getLastFrameColor(uv+vec2(px.x,0)).rgb-
               getLastFrameColor(uv-vec2(px.x,0)).rgb;
    finalRGB=mix(finalRGB,vec3(pow(length(grad),.5)),EDGE_STRENGTH);

    // trail / persistence
    finalRGB=mix(prevRGB,finalRGB,
                 TRAIL_MIX*mix(.3,1.,animateBounce(time)));

    fragColor=vec4(finalRGB,1.);
}
