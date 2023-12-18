#version 300 es
precision highp float;

uniform float energy;
out vec4 fragColor;

vec4 mainImage(float energy){
  float energyNormalized=fract(energy);
  return vec4(energyNormalized,0.,0.,1.);
}

void main(){
  fragColor=mainImage(energy);
}
