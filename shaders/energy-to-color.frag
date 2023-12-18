#version 300 es
precision highp float;

uniform float energyNormalized;
out vec4 fragColor;

vec4 mainImage(float energyNormalized){
  return vec4(energyNormalized,0.,0.,1.);
}

void main(){
  fragColor=mainImage(energyNormalized);
}
