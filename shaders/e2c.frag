#version 300 es
precision highp float;

uniform float spectralCentroidNormalized;// Normalized spectral centroid
out vec4 fragColor;

vec4 generateVisual(float normalizedCentroid){
  // Generate a dynamic color based on the spectral centroid
  vec3 color=vec3(normalizedCentroid,1.-normalizedCentroid,.5*normalizedCentroid);
  
  // Create an evolving pattern or effect
  // Example: A circular pattern that changes its radius with the spectral centroid
  float pattern=sin(normalizedCentroid*20.)*cos(normalizedCentroid*20.);
  color*=pattern;
  
  // Return the color with full opacity
  return vec4(color,1.);
}

void main(){
  fragColor=generateVisual(spectralCentroidNormalized);
}
