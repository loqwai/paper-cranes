#version 300 es
precision mediump float;

uniform vec2 resolution;
uniform float time;
uniform sampler2D prevFrame;// Previous frame texture

out vec4 fragColor;

// Function to calculate the Julia set
vec3 julia(vec2 uv,vec2 c){
  int maxIter=100;
  vec2 z=uv;
  float i;
  for(i=0.;i<float(maxIter);i++){
    z=vec2(z.x*z.x-z.y*z.y,2.*z.x*z.y)+c;
    if(length(z)>2.)break;
  }
  return i==float(maxIter)?vec3(0.):vec3(i/float(maxIter));
}

// Main image function
void mainImage(out vec4 fragColor,in vec2 fragCoord,float time){
  vec2 uv=(fragCoord-.5*resolution.xy)/min(resolution.y,resolution.x);
  uv*=2.;// Scale UV coordinates for more zoomed-in view
  
  // Parameters for Julia set, animated over time
  float real=sin(time)*.7885;
  float imag=cos(time)*.7885;
  vec2 c=vec2(real,imag);// Constant c for Julia set calculation
  
  // Calculate Julia set color
  vec3 color=julia(uv,c);
  
  // Blend with previous frame to create a melting effect
  vec3 prevColor=texture(prevFrame,uv).rgb;
  color=mix(color,prevColor,.2);
  
  fragColor=vec4(color,1.);
}

void main(void){
  mainImage(fragColor,gl_FragCoord.xy,time);
}
