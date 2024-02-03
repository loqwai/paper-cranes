#pragma glslify: import(./includes/full.frag)


vec2 triangle_wave(vec2 a){
  vec2 a2=
  vec2(1.,.5)
  ,
  a1=a+a2;
  return abs(fract((a1)*(a2.x+a2.y))-.5);
}

const float scale=1.5;

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
  for(int k=0;k<8+int(energyMean*10.);k++){
    float warp_scale=16.*energyMean*2.;
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
    if(beat)c1*=1.5;
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

void mainImage(out vec4 fragColor,in vec2 fragCoord){
  vec2 uv=(fragCoord.xy/resolution.xy)/2.;
  //rotate uv over time
  uv=rotate(uv,time*.1);
  vec3 col1=fractal(uv);

  // Apply HSL color mutations based on audio features
  vec3 hsl=rgb2hsl(col1);
  // hsl.x += sin(time) * energyNormalized; // Hue shift based on energyNormalized
  hsl.y=mix(hsl.y,1.,energyNormalized);// Increase saturation based on energyNormalized
  vec3 rgb=hsl2rgb(hsl);
  // mix with previous frame
  vec4 prev=texture(prevFrame,fragCoord.xy/resolution.xy);
  // rgb = mix(prev.rgb, rgb, 0.1);
  fragColor=vec4(rgb/2.,1.);
}
void main(){
  mainImage(fragColor,gl_FragCoord.xy);
}
