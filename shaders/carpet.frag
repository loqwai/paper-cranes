#version 300 es
precision highp float;
// Assuming these uniforms are passed to the shader
uniform float time;                      // iTime equivalent        // Normalized energy

uniform sampler2D prevFrame;             // Texture of the previous frame
uniform vec2 resolution;                 // iResolution equivalent

uniform float spectralCentroidNormalized;
uniform float spectralCentroidZScore;
uniform float spectralCentroid;
uniform float spectralSkewMean;
uniform float spectralCrest;
uniform float energyNormalized;
uniform float spectralFluxNormalized;
uniform float spectralFluxZScore;
uniform float spectralFluxMax;
uniform float spectralFluxMean;
uniform float spectralSpreadMax;
uniform float spectralSpreadZScore;
uniform float energyMax;
uniform float energyMin;
uniform float energyStandardDeviation;
uniform float energyMean;
uniform float energyZScore;
uniform float spectralEntropyMin;
uniform float spectralEntropyMax;
uniform float spectralRoughness;
uniform float spectralRoughnessNormalized;
uniform bool beat;
out vec4 fragColor;
// ... [existing functions like triangle_wave, transform, etc.] ...

vec3 rgb2hsl(vec3 color){
  float maxColor=max(max(color.r,color.g),color.b);
  float minColor=min(min(color.r,color.g),color.b);
  float delta=maxColor-minColor;

  float h=0.f;
  float s=0.f;
  float l=(maxColor+minColor)/2.f;

  if(delta!=0.f){
    s=l<.5f?delta/(maxColor+minColor):delta/(2.f-maxColor-minColor);

    if(color.r==maxColor){
      h=(color.g-color.b)/delta+(color.g<color.b?6.f:0.f);
    }else if(color.g==maxColor){
      h=(color.b-color.r)/delta+2.f;
    }else{
      h=(color.r-color.g)/delta+4.f;
    }
    h/=6.f;
  }

  return vec3(h,s,l);
}

// Helper function for HSL to RGB conversion
float hue2rgb(float p,float q,float t){
  if(t<0.f)
  t+=1.f;
  if(t>1.f)
  t-=1.f;
  if(t<1.f/6.f)
  return p+(q-p)*6.f*t;
  if(t<1.f/2.f)
  return q;
  if(t<2.f/3.f)
  return p+(q-p)*(2.f/3.f-t)*6.f;
  return p;
}

// Function to convert HSL to RGB
vec3 hsl2rgb(vec3 hsl){
  float h=hsl.x;
  float s=hsl.y;
  float l=hsl.z;

  float r,g,b;

  if(s==0.f){
    r=g=b=l;// achromatic
  }else{
    float q=l<.5f?l*(1.f+s):l+s-l*s;
    float p=2.f*l-q;
    r=hue2rgb(p,q,h+1.f/3.f);
    g=hue2rgb(p,q,h);
    b=hue2rgb(p,q,h-1.f/3.f);
  }

  return vec3(r,g,b);
}

float getGrayPercent(vec4 color){
  vec3 hsl=rgb2hsl(color.rgb);
  return hsl.y;
}

vec2 triangle_wave(vec2 a){
    vec2 a2 =
        vec2(1.,0.5)
    ,
    a1 = a+a2;
    return abs(fract((a1)*(a2.x+a2.y))-.5);
}

const float scale = 1.5;

void transform(inout vec2 uv, inout vec2 t2){
        t2 = triangle_wave(uv+.5);
        uv =
            t2-triangle_wave(uv.yx)-fract(t2/2.)
        ;
}

vec2 rotate(vec2 v, float a) {
	float s = sin(a);
	float c = cos(a);
	mat2 m = mat2(c, s, -s, c);
	return m * v;
}

vec3 fractal(vec2 uv){
    vec3 col = vec3(0.);
    vec2 t2 = vec2(0.);
    vec3 col1 = col;
    float c1=0.;
    for(int k = 0; k < 8 + int(energyMean * 10.); k++){
        float warp_scale = 16. * energyMean * 2.;
        vec2 warp =
            //abs(.5-fract(uv*3.))*3.
            //abs(.5-fract(t2*3.))*3.
            vec2(sin((t2.x)*warp_scale),cos((t2.y)*warp_scale))
            //vec2(sin((uv.x)*warp_scale),cos((uv.y)*warp_scale))
        ;
        uv.y -= 1./4.;

        uv = (uv+t2)/scale;

        uv = (fract(vec2(uv+vec2(.5,1.5))*scale)-.5)/scale;
        col.x =
            max(length(uv-t2-c1)/3.,col.x);

        ;
        if(k>1)
        warp = warp*warp/warp_scale;
        else
        warp = vec2(0);

        vec2 uv_1 =
            uv + warp.yx
        ,
        t2_1=
            t2 + warp.yx
        ;
        vec3 col_1 = col;
        transform(uv,t2);

        transform(uv_1,t2_1);
        //uv_1 = rotate(uv_1,t2.x*2.);
        //t2_1 = rotate(t2_1,t2.x*2.);

        c1 =
            max(abs(uv_1.y+uv_1.x)/2.,c1)
            //max(abs(uv_1.y-uv_1.x),c1)
        ;
        c1 =
            max(1.-abs(2.*c1-1.),c1/4.)
        ;
        if(beat) c1 *= 1.5;
        col.x =
            max(length(uv_1-t2_1-c1)/3.,col.x)

        ;
        col =
            abs(col-(1.-(c1*col.x)));
        col1 =
            abs(col1*c1-col-1.).yzx;
    }
    return col1;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord.xy / resolution.xy) / 2.0;
    //rotate uv over time
    uv = rotate(uv, time * 0.1);
    vec3 col1 = fractal(uv);

    // Apply HSL color mutations based on audio features
    vec3 hsl = rgb2hsl(col1);
    // hsl.x += sin(time) * energyNormalized; // Hue shift based on energyNormalized
    hsl.y = mix(hsl.y, 1.0, energyNormalized); // Increase saturation based on energyNormalized
    vec3 rgb = hsl2rgb(hsl);
    // mix with previous frame
    vec4 prev = texture(prevFrame, fragCoord.xy / resolution.xy);
    // rgb = mix(prev.rgb, rgb, 0.1);
    fragColor = vec4(rgb / 2.0, 1.0);
}
void main() {
    mainImage(fragColor, gl_FragCoord.xy);
}
