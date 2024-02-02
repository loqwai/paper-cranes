

void mainImage(out vec4 FragColor,vec2 FragCoord){
  int l=int(spectralFlux/100.);
  vec2 v=(FragCoord.xy-resolution.xy/2.)/min(resolution.y,resolution.x)*30.;
  
  vec2 vv=v;
  float ft=time+360.1;
  float tm=ft*.1;
  float tm2=ft*.3;
  
  // Modify the harmonics with spectralCentroidNormalized
  float spectralHarmonic=spectralCentroidNormalized*.5+10.;
  
  vec2 mspt=(vec2(sin(tm)+cos(tm)+spectralRolloffMedian+sin(tm*spectralCentroidMedian)+cos(tm*-spectralEntropyMedian)+sin(tm*spectralSpreadMedian),cos(tm)+sin(tm*.1)+cos(tm*spectralRoughnessMedian)+sin(tm*-spectralCrestMedian)+cos(tm*spectralSkewMedian))+1.+spectralHarmonic)*energyStandardDeviation;
  
  float R=0.;
  float RR=0.;
  float RRR=0.;
  float a=(1.-mspt.x)*(energyMedian/10.+.5);
  float C=cos(tm2*.03+a*.01)*(spectralCentroidMedian/10.+.1);
  float S=sin(tm2*spectralSkewMedian+a*.23)*spectralFluxMedian;
  float C2=cos(tm2*.024+a*.23)*3.1;
  float S2=sin(tm2*.03+a*.01)*3.3;
  vec2 xa=vec2(C,-S);
  vec2 ya=vec2(S,C);
  vec2 xa2=vec2(C2,-S2);
  vec2 ya2=vec2(S2,C2);
  vec2 shift=vec2(spectralSkewMedian,.14);
  vec2 shift2=vec2(-.023,-.22);
  float Z=.4+mspt.y*.3;
  float m=.99+sin(time*.03)*.003;
  
  for(int i=0;i<l;i++){
    float r=dot(v,v);
    float r2=dot(vv,vv);
    if(r>1.){
      r=(1.)/r;
      v.x=v.x*r;
      v.y=v.y*r;
    }
    if(r2>1.){
      r2=(1.)/r2;
      vv.x=vv.x*r2;
      vv.y=vv.y*r2;
    }
    R*=m;
    R+=r;
    R*=m;
    R+=r2;
    if(i<l-1){
      RR*=m;
      RR+=r;
      RR*=m;
      RR+=r2;
      if(i<l-2){
        RRR*=m;
        RRR+=r;
        RRR*=m;
        RRR+=r2;
      }
    }
    
    v=vec2(dot(v,xa),dot(v,ya))*Z+shift;
    vv=vec2(dot(vv,xa2),dot(vv,ya2))*Z+shift2;
  }
  
  float c=((mod(R,2.)>1.)?1.-fract(R):fract(R));
  float cc=((mod(RR,2.)>1.)?1.-fract(RR):fract(RR));
  float ccc=((mod(RRR,2.)>1.)?1.-fract(RRR):fract(RRR));
  
  // Blend with previous frame for motion blur effect
  vec4 prevColor=texture(prevFrame,FragCoord/resolution);
  vec4 currentColor=vec4(ccc,cc,c,1.);
  
  // Adjust blending factor based on energyNormalized
  float blendFactor=mix(.5,.9,energyMedian)/5.;
  if(beat)blendFactor*=10.;
  // if the color is too close to black, discard.
  if(currentColor.r+currentColor.g+currentColor.b<.001)discard;
  FragColor=mix(prevColor,currentColor,blendFactor);
}
