
// Function to apply Julia set distortion
vec2 julia(vec2 uv,float t){
  vec3 prevColor=getLastFrameColor(uv).rgb;
  // Julia set parameters
  float cRe=sin(t)*.7885;
  float cIm=cos(t)*.7885;

  // Apply the Julia set formula
  int maxIter=64;
  for(int i=0;i<maxIter;i++){
    float x=uv.x*uv.x-uv.y*uv.y+cRe;
    float y=2.*uv.x*uv.y+cIm;
    uv.x=x;
    uv.y=y;

    // Break if the point escapes to infinity
    if(length(uv)>2.)break;
  }

  return uv;
}

// Main image function
void mainImage(out vec4 fragColor,in vec2 fragCoord){

  vec2 uv=fragCoord.xy/resolution.xy;
  float t=time/10.;

//   Adjusted UV transformations for a more even distribution
  uv+=(vec2(spectralSpreadMax,spectralSpreadMax))/10.;
  uv+=vec2(sin(t*2.)*(spectralCentroidNormalized-.5)/10.,
  cos(t*2.)*(spectralCentroidNormalized-.5)/10.);

  uv=julia(uv,t);

//   if(beat){
//     uv=julia(uv,t);
//   }


  // Sample previous frame color
  vec3 prevColor=getLastFrameColor(uv).rgb;

  // Select this pixel based on frame and spectral data
  float band = smoothstep(0.0, 0.1, uv.x*100.-mod(t*100.,100.));
  vec3 hsl = vec3(0.5);
  hsl.z *= 0.9 + sin(uv.x);
  hsl.y *= 0.9 + sin(uv.y);
//   prevColor = mix(prevColor, hsl2rgb(hsl), band);

  // Normalize coordinates to -1.0 to 1.0 range for ripple effect
  vec2 rippleUv = uv*2.-1.;
  if(beat) rippleUv *= 2.1;

  // Calculate ripple effect with smoother transitions
  float distanceToCenter = length(rippleUv);
  float ripple = sin(distanceToCenter*(8.)-t*1.5)*.3+.5;

  // Generate psychedelic color with smoother transitions
  float hue = mod(t*15.+distanceToCenter*60.+(15.),360.);
  vec3 color = hsl2rgb(vec3(hue,0.8,0.5));

  // Apply ripple effect with reduced intensity
  color *= ripple;

  // Smoother color mixing
  color = mix(prevColor, color, 0.7);
//   if(spectralCentroidZScore>0.9){
//     // Smoother saturation changes

//     hsl.y = min(hsl.y*1.2, 1.0);
//     color = hsl2rgb(hsl);
//   }
  uv = fragCoord.xy/resolution.xy;
//   prevColor = getLastFrameColor(uv).rgb;
  vec3 prevHsl = rgb2hsl(prevColor);

  if(hsl.y < 0.5){
    // do something here. Rotate the color
    hsl.x += spectralCentroid;
    hsl.y += (prevHsl.x)/10.;
  }

  if(hsl.z > 0.8) {
    hsl.z -= bassNormalized;
    hsl.x += spectralKurtosisZScore/10.;
  }
  if(hsl.z < 0.1) {
    hsl.z += spectralCrestZScore/10.;
  }

  color = fract(hsl2rgb(hsl));
  uv = fragCoord.xy/resolution.xy;

  fragColor = vec4(color, 1.);
}
