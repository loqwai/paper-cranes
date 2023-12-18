#version 300 es
precision highp float;

out vec4 fragColor;

vec4 mainImage(){
  return vec4(1.,0.,0.,1.);
}
void main(){
  fragColor=mainImage();
}
