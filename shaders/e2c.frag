#version 300 es
precision highp float;

uniform vec2 resolution;
uniform float time;
out vec4 fragColor;

// Function to draw a branch
bool drawBranch(vec2 uv,vec2 origin,float length,float angle,float width){
  uv-=origin;
  uv=vec2(uv.x*cos(angle)-uv.y*sin(angle),uv.x*sin(angle)+uv.y*cos(angle));
  return abs(uv.x)<width&&uv.y>0.&&uv.y<length;
}

void main(){
  vec2 uv=(gl_FragCoord.xy-.5*resolution.xy)/resolution.y;
  
  // Adjust vertical position
  float verticalShift=+2.5;// Move the tree downwards
  uv.y+=verticalShift;
  
  vec3 col=vec3(0.);
  
  // Trunk
  float trunkWidth=.05;
  float trunkHeight=.5;
  vec2 trunkOrigin=vec2(0.,verticalShift);
  if(drawBranch(uv,trunkOrigin,trunkHeight,0.,trunkWidth)){
    col=vec3(.60,.40,.20);// Brown color
  }
  
  // Branches
  float branchLength=.25;
  float branchWidth=.02;
  float angleStep=3.14159/6.;
  for(float i=1.;i<4.;i++){
    float angle=i*angleStep;
    vec2 branchOrigin=vec2(0.,verticalShift+trunkHeight-.35+.15*i);
    if(drawBranch(uv,branchOrigin,branchLength,angle,branchWidth)||
    drawBranch(uv,branchOrigin,branchLength,-angle,branchWidth)){
      col=vec3(.60,.40,.20);// Brown color
    }
  }
  
  fragColor=vec4(col,1.);
}
