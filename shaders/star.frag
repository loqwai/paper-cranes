#version 300 es
precision highp float;

uniform float time;
uniform float spectralCentroidNormalized;
uniform float spectralCentroidZScore;
uniform float spectralCentroid;
uniform float spectralSkewMean;
uniform float spectralCrest;
uniform float energyNormalized;
uniform float spectralFluxNormalized;
uniform float spectralFluxMax;
uniform float spectralSpreadMax;
uniform float spectralSpreadZScore;
uniform float energyMax;
uniform float energyMin;
uniform float energyStandardDeviation;
uniform float energyMean;
uniform float energyZScore;
uniform float energy;
uniform float spectralEntropyMin;
uniform float spectralEntropyMax;
uniform float spectralRoughnessNormalized;
uniform vec2 resolution;
uniform bool beat;
out vec4 fragColor;
float REPEAT=3.;

vec3 rgb2hsl(vec3 color){
  float maxColor=max(max(color.r,color.g),color.b);
  float minColor=min(min(color.r,color.g),color.b);
  float delta=maxColor-minColor;
  
  float h=0.f;
  float s=0.f;
  float l=(maxColor+minColor)/2.f;
  
  if(delta!=0.f){
    s=l<.5f?delta/(maxColor+minColor):delta/(2.f-maxColor-minColor);
    
    if(color.r==maxColor){
      h=(color.g-color.b)/delta+(color.g<color.b?6.f:0.f);
    }else if(color.g==maxColor){
      h=(color.b-color.r)/delta+2.f;
    }else{
      h=(color.r-color.g)/delta+4.f;
    }
    h/=6.f;
  }
  
  return vec3(h,s,l);
}

// Helper function for HSL to RGB conversion
float hue2rgb(float p,float q,float t){
  if(t<0.f)
  t+=1.f;
  if(t>1.f)
  t-=1.f;
  if(t<1.f/6.f)
  return p+(q-p)*6.f*t;
  if(t<1.f/2.f)
  return q;
  if(t<2.f/3.f)
  return p+(q-p)*(2.f/3.f-t)*6.f;
  return p;
}

// Function to convert HSL to RGB
vec3 hsl2rgb(vec3 hsl){
  float h=hsl.x;
  float s=hsl.y;
  float l=hsl.z;
  
  float r,g,b;
  
  if(s==0.f){
    r=g=b=l;// achromatic
  }else{
    float q=l<.5f?l*(1.f+s):l+s-l*s;
    float p=2.f*l-q;
    r=hue2rgb(p,q,h+1.f/3.f);
    g=hue2rgb(p,q,h);
    b=hue2rgb(p,q,h-1.f/3.f);
  }
  
  return vec3(r,g,b);
}

float getGrayPercent(vec4 color){
  vec3 hsl=rgb2hsl(color.rgb);
  return hsl.y;
}

mat2 rot(float a){
  float c=cos(a),s=sin(a);
  return mat2(c,s,-s,c);
}

float sdBox(vec3 p,vec3 b){
  vec3 q=abs(p)-b;
  return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.);
}

float box(vec3 pos,float scale){
  pos*=scale;
  float base=sdBox(pos,vec3(.4,.4,.1))/1.5;
  pos.xy*=5.;
  pos.y-=3.5;
  pos.xy*=rot(.75);
  if(beat){
    pos.xy*=rot(time*.4);
  }
  float result=-base;
  return result;
}

float box_set(vec3 pos){
  vec3 pos_origin=pos;
  float dynamicMovement=sin(time*.4+spectralCentroidNormalized)*2.5;
  
  // Apply audio feature modifications
  pos=pos_origin;
  pos.y+=dynamicMovement;
  pos.xy*=rot(.8+spectralCentroidZScore*.2);// Rotate based on spectralCentroidZScore
  float box1=box(pos,2.-abs(sin(time*.4))*1.5+energyNormalized);
  
  pos=pos_origin;
  pos.y-=dynamicMovement;
  pos.xy*=rot(.8+spectralCentroidZScore*.2);
  float box2=box(pos,2.-abs(sin(time*.4))*1.5+energyNormalized);
  
  pos=pos_origin;
  pos.x+=dynamicMovement;
  pos.xy*=rot(.8+spectralCentroidZScore*.2);
  float box3=box(pos,2.-abs(sin(time*.4))*1.5+energyNormalized);
  
  pos=pos_origin;
  pos.x-=dynamicMovement;
  pos.xy*=rot(.8+spectralCentroidZScore*.2);
  float box4=box(pos,2.-abs(sin(time*.4))*1.5+energyNormalized);
  
  pos=pos_origin;
  pos.xy*=rot(.8+spectralCentroidZScore*.2);
  float box5=box(pos,.5)*6.;
  
  pos=pos_origin;
  float box6=box(pos,.5)*6.;
  
  // Combine the boxes to create the final shape
  float result=max(max(max(max(max(box1,box2),box3),box4),box5),box6);
  return result;
}

float map(vec3 pos){
  vec3 pos_origin=pos;
  float box_set1=box_set(pos);
  
  return box_set1;
}

void mainImage(out vec4 fragColor,in vec2 fragCoord){
  vec2 p=(fragCoord.xy*2.-resolution.xy)/min(resolution.x,resolution.y);
  vec3 ro=vec3(0.,-.2,time*4.);
  vec3 ray=normalize(vec3(p,1.5));
  ray.xy=ray.xy*rot(sin(time*.03)*5.);
  ray.yz=ray.yz*rot(sin(time*.05)*.2);
  float t=.1;
  vec3 col=vec3(0.);
  float ac=0.;
  
  for(int i=0;i<50;i++){
    vec3 pos=ro+ray*t;
    pos=mod(pos-2.,4.)-2.;
    float d=map(pos);
    
    d=max(abs(d),.01);
    ac+=exp(-d*23.);
    
    t+=d*.55;
  }
  
  col=vec3(ac*.02);
  col+=vec3(0.,.2*abs(sin(time)),.5+sin(time)*.2);
  if(col.b<.1&&col.r<.1&&col.g<.1){
    discard;
  }
  // rotate the color via hsl when the energy is high
  col=hsl2rgb(vec3(getGrayPercent(vec4(col,1.)),1.,.5));
  
  fragColor=vec4(col,1.-t*(.02+.02*sin(time)));
}

void main(){
  mainImage(fragColor,gl_FragCoord.xy);
}
