#version 300 es
precision mediump float;

uniform bool beat;
uniform vec2 resolution;
uniform float time;
uniform sampler2D prevFrame;// Image texture
uniform float spectralSpreadZScore;
uniform float spectralCentroid;
uniform float spectralCentroidZScore;
uniform float energyZScore;
uniform float energyNormalized;
uniform float energyMax;
uniform float spectralFluxMax;
out vec4 fragColor;

vec4 getLastFrameColor(vec2 uv){
  return texture(prevFrame,uv);
}

void mainImage(out vec4 fragColor,in vec2 fragCoord,float time)
{
  vec2 uv=(2.*fragCoord-resolution.xy)/resolution.y;
  
  // background
  vec3 color=vec3(.8+.2*uv.y);
  
  // bubbles
  for(int i=0;i<40;i++)
  {
    // bubble seeds
    float pha=sin(float(i)*546.13+energyMax/10.)*.5+.5;
    float siz=pow(sin(float(i)*651.74+5.)*.5+.5,4.);
    float pox=sin(float(i)*321.55+4.1)*resolution.x/resolution.y;
    
    // bubble size, position and color
    float rad=.1+.5*siz;
    vec2 pos=vec2(pox,-1.-rad+(2.+2.*rad)*mod(pha+.1*time*(.2+spectralCentroidZScore*siz),1.));
    float dis=length(uv-pos);
    vec3 col=mix(vec3(spectralCentroid,energyNormalized,0.),vec3(.1,.4,.8),.5+.5*sin(float(i)*1.2+1.9));
    //    col+= 8.0*smoothstep( rad*0.95, rad, dis );
    
    // render
    float f=length(uv-pos)/rad;
    f=sqrt(clamp(1.-f*f,0.,1.));
    color-=col.zyx*(1.-smoothstep(rad*.95,rad,dis))*f;
  }
  
  // vigneting
  color*=sqrt(1.5-.5*length(uv));
  vec3 lastFrameColor=getLastFrameColor(uv).rgb;
  color=mix(lastFrameColor,color,.06);
  fragColor=vec4(color,1.);
}

void main(void){
  mainImage(fragColor,gl_FragCoord.xy,time);
}
