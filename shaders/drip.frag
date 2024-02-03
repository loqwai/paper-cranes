#pragma glslify: import(./includes/full.frag)
// Swirl and wave parameters
// Swirl function
vec2 swirl(vec2 p){
  float swirlIntensity=spectralSpreadNormalized*.5;

  float angle=atan(p.y,p.x);
  float radius=length(p);
  angle+=swirlIntensity*sin(radius*10.+time);
  return radius*vec2(cos(angle),sin(angle));
}

// Wave function
vec2 wave(vec2 p){
  float waveFrequency=spectralCentroidNormalized*10.;
  float waveAmplitude=spectralFluxNormalized*.2;
  return p+vec2(sin(p.x*waveFrequency+time),cos(p.y*waveFrequency+time))*waveAmplitude;
}

// Fractal function
vec2 julia(vec2 p){
  float fractalIterations=spectralRoughnessZScore+8.;
  float fractalScale=1.5;
  // Mandelbrot or other fractal pattern
  //distance from the center of the screen
  vec2 z=vec2(0.);
  for(int i=0;i<int(fractalIterations);i++){
    z=vec2(z.x*z.x-z.y*z.y,spectralSpreadZScore*z.x*z.y)+p;
    if(dot(z,z)>4.)break;
  }
  return z;
}
vec2 plasma(vec2 p){
  vec2 z=vec2(0.);
  float iterations=0.;

  for(int i=0;i<int(spectralFluxMedian)+50;i++){// Adjust the maximum iterations
    z=vec2(z.x*z.x-z.y*z.y,2.*z.x*z.y)+p;
    iterations+=1.-smoothstep(0.,.01,dot(z,z));// Accumulate iterations smoothly
    if(dot(z,z)>spectralSpreadMedian)break;
  }

  // Map iterations to a smooth color gradient using a sine function
  return sin(iterations*3.14159)*vec2(.5)+vec2(.5);
}

// Drip effect
float drip(vec2 p){
  // Drip effect (using spectralFluxNormalized for speed and spectralSkewNormalized for length)
  float dripSpeed=spectralFluxNormalized*.5+.1;
  float dripLength=spectralSkewNormalized*.8+.2;
  float dripIntensity=.5;// Keep this fixed for now
  vec2 d=p-vec2(.5);
  return sin(length(d)*dripSpeed+time)*dripIntensity*smoothstep(0.,dripLength,length(d));
}

vec3[5] getPalette(vec2 uv){
  // Example palette
  // Color palette
  vec3 palette[5]=vec3[5](
    fract(vec3(spectralEntropyMedian,spectralRolloffMedian,spectralFluxMedian)),
    vec3(0.,0.,1.),
    vec3(0.,1.,0.),
    vec3(1.,0.,0.),
    fract(vec3(spectralEntropyMean,energyMean,spectralCentroidMean))
    // vec3(0.,0.,1.)
  );
  return palette;
}

void mainImage(out vec4 fragColor,in vec2 fragCoord){
  vec2 uv=fragCoord.xy/resolution.xy;
  vec3 palette[5]=getPalette(uv);
  vec2 f=julia(uv);// Calculate Julia set first
  f*=julia(uv.yx);// then the second one
  f*=julia(-uv.xy);// then the third one
  f*=julia(-uv.yx);// then the fourth one
  f=fract(f);
  // roate the uv around the center for plasma

  uv-=spectralCentroidMedian;
  uv*=mat2(cos(time),sin(time),-sin(time),cos(time));
  vec2 m=plasma(uv);// Calculate plasma set

  vec2 mixFactor=vec2(.1);// Blend based on horizontal position
  vec2 w=mix(f,m,mixFactor.x);// Blend Julia and Mandelbrot
  w=swirl(wave(w));// Apply swirl and wave effects
  float d=drip(w);
  vec2 offset=w*spectralKurtosisNormalized+vec2(d,d)+sin(time);

  // Map music features to color
  vec3 color=vec3(0.);
  color=palette[frame%5];
  color.r=spectralCentroidNormalized;// Example mapping
  color.g=spectralRolloffNormalized;// Example mapping
  color.b=energyNormalized;// Example mapping

  // Adjust color based on drip and fractal
  color=mix(color,vec3(m.x,w.y,d),offset.x);
  color=mix(color,hsl2rgb(vec3(color.r,color.g+offset.y,color.b)),offset.y);

  vec3 last=getLastFrameColor(uv).rgb;
  color=mix(color,last,energyZScore);
  // if the color is too close to black, compute a mandelbrot and use that as the color instead
  // if(dot(color,color)<.05||dot(color,color)>1.5){
    //   vec2 p=uv*2.-1.;
    //   p.x*=resolution.x/resolution.y;
    //   vec2 z=plasma(p);
    //   color=vec3(z.x*spectralCentroidMedian,z.y*spectralRolloffMedian,spectralFluxMedian);
  // }
  // if it's still too close to black, use the last frame's color
  // if(dot(color,color)<.25){
    //   vec3 hsl=rgb2hsl(last);
    //   hsl.x=fract(hsl.x+.01);
    //   color=hsl2rgb(hsl);
    //   // color=last;
  // }
  vec3 hsl=rgb2hsl(color);
  vec3 hslLast=rgb2hsl(last);
  hsl.x=fract(hsl.x+hslLast.x*.1);
  hsl.y=clamp(hsl.y+hslLast.y*.1,0.,1.);
  color=hsl2rgb(hsl);
  if(hsl.y<.1){
    color=palette[frame+1%5];
  }
  fragColor=vec4(mix(color,last,.3),1.);
}
#pragma glslify: import(./includes/shadertoy-compat-main)
