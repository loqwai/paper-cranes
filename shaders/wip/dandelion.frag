#define t iTime/4.

void mainImage(out vec4 fragColor,in vec2 fragCoord){
  vec2 translate=vec2(spectralCentroid,energy*10.)*100.;
  vec2 p=(2.*fragCoord.xy-iResolution.xy)/iResolution.y;
  vec2 mp=translate/iResolution.xy*.5+.5;
  
  float s=1.;
  if(beat)s=.5;
  for(int i=0;i<7;i++){
    s=max(s,abs(p.x)-.375);
    p=abs(p*2.25)-mp*1.25;
    p*=mat2(cos(t+mp.x),-sin(t+mp.y),sin(t+mp.y),cos(t+mp.x));
  }
  
  vec3 col=vec3(4.,2.,1.)/abs(atan(p.y,p.x))/s;
  
  fragColor=vec4(col,1.);
}
