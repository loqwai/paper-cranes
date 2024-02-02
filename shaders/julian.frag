
// Swirl and wave parameters

// Swirl function
vec2 swirl(vec2 p){
  float swirlIntensity=spectralSpreadNormalized*.5;
  
  float angle=atan(p.y,p.x);
  float radius=length(p);
  angle+=swirlIntensity*sin(radius*spectralCrestMax+time);
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
  float fractalIterations=8.;
  float fractalScale=1.5;
  // Mandelbrot or other fractal pattern
  //distance from the center of the screen
  vec2 z=vec2(0.);
  for(int i=0;i<int(fractalIterations);i++){
    z=vec2(z.x*z.x-z.y*z.y,2.*z.x*z.y)+p;
    if(dot(z,z)>4.)break;
  }
  return z;
}
vec2 mandelbrot(vec2 p){
  vec2 z=vec2(0.);
  float iterations=0.;
  
  for(int i=0;i<int(spectralFluxMedian)+50;i++){// Adjust the maximum iterations
    z=vec2(z.x*z.x-z.y*z.y,2.*z.x*z.y)+p;
    iterations+=1.-smoothstep(0.,spectralRoughnessZScore+2.5,dot(z,z));// Accumulate iterations smoothly
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
  float dripIntensity=(9.5*energyZScore);// Keep this fixed for now
  vec2 d=p-vec2(spectralKurtosisNormalized);
  return sin(length(d)*dripSpeed+time)*dripIntensity*smoothstep(0.,dripLength,length(d));
}

vec3[5]getPalette(vec2 uv){
  // Example palette
  // Color palette
  vec3 palette[5]=vec3[5](
    rgb2hsl(vec3(.251,.0235,.2745)),
    rgb2hsl(vec3(0.,0.,1.)),
    rgb2hsl(vec3(.6784,.0039,.9686)),
    rgb2hsl(vec3(1.,0.,.8314)),
    rgb2hsl(vec3(.0196,.0039,.1804))
  );
  return palette;
}

void mainImage(out vec4 fragColor,in vec2 fragCoord){
  vec2 uv=fragCoord.xy/resolution.xy;
  uv-=.5;
  // rotate
  uv*=mat2(cos(time),sin(time),-sin(time),cos(time));
  uv+=.5;
  vec3 palette[5]=getPalette(uv);
  vec2 f=julia(uv);// Calculate Julia set first
  f*=julia(uv.yx-vec2(spectralEntropyMean));// then the second one
  f*=julia(-uv.x+vec2(spectralSpreadMean));// then the third one
  // f*=julia(-uv.yx-vec2(spectralRoughnessMedian));// then the fourth one
  f=fract(f);
  
  uv-=spectralCentroidMedian;
  // uv*=mat2(cos(time),sin(time),-sin(time),cos(time));
  vec2 m=mandelbrot(uv);// Calculate mandelbrot set
  
  vec2 mixFactor=vec2(uv.y);// Blend based on horizontal position
  vec2 w=mix(f,m,mixFactor.x);// Blend Julia and Mandelbrot
  w=swirl(wave(w));// Apply swirl and wave effects
  float d=drip(w);
  vec2 offset=w*vec2(d,d)+sin(time);
  
  // Map music features to color
  vec3 color=vec3(0.);
  color=palette[2];
  
  // Adjust color based on drip and fractal
  color=mix(color,vec3(m.x,w.y,d),offset.x);
  color=mix(color,hsl2rgb(vec3(color.r,color.g+offset.y,color.b)),offset.y);
  
  vec3 last=getLastFrameColor(uv*d).rgb;
  
  vec3 hsl=rgb2hsl(fract(color));
  vec3 closestPalette=vec3(1000.);
  for(int i=0;i<5;i++){
    vec3 currentPaletteColor=palette[i];
    if(abs(hsl.x-currentPaletteColor.x)<abs(hsl.x-closestPalette.x)){
      closestPalette=currentPaletteColor;
    }
  }
  vec3 hslLast=rgb2hsl(last);
  hsl.x=(hsl.x+closestPalette.x)/2.;
  if(last.y>.2||last.z>.2){
    hsl.y=(hsl.y+hslLast.y)/2.;
    hsl.z=(hsl.z+hslLast.z)/2.;
  }
  hsl.y=closestPalette.y;
  hsl.z=closestPalette.z;
  
  color=fract(hsl2rgb(hsl));
  fragColor=vec4(color,1.);
  // fragColor=vec4(color,1.);
}
