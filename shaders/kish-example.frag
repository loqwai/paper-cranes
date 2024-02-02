void mainImage(out vec4 fragColor,in vec2 fragCoord,Stats energyStats){
  vec2 uv=fragCoord/iResolution.xy;
  fragColor=vec4(uv.x,uv.y,energyStats.zScore,1.);
}
