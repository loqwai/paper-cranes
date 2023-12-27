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
uniform float spectralFluxMax;
out vec4 fragColor;

vec4 getLastFrameColor(vec2 uv){
    return texture(prevFrame,uv);
}

// Function to convert RGB to HSL
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
    return(color.r+color.g+color.b)/3.f;
}

const float TAU=6.28318;

vec3 palette(in float t)
{
    
    // vec3 a = vec3(0.138, 0.189, 0.761); vec3 b = vec3(0.448, 0.797, 0.568); vec3 c = vec3(0.591, 1.568, 0.065); vec3 d = vec3(4.347, 2.915, 0.976);
    
    vec3 a=vec3(0.,.500,.500);
    vec3 b=vec3(2.,.500,.490);
    vec3 c=vec3(2.,2.,.500);
    vec3 d=vec3(0.,.667,.500);
    vec3 baseColor=a+b*cos(TAU*(c*t+d));
    // rotate hue by the centroid
    vec3 hsl=rgb2hsl(baseColor);
    hsl.y+=spectralCentroid;
    return hsl2rgb(hsl);
    
}
void mainImage(out vec4 fragColor,in vec2 fragCoord,float time)
{
    vec2 uv=(fragCoord*2.-resolution.xy)/resolution.y;
    // rotate uv coordinates over time
    float centroidNegative1To1=spectralCentroid*2.-1.;
    float uvRotation=(centroidNegative1To1/100.)+time/100.;
    float distanceFromCenter=length(uv);
    float distanceFromCenterNormalized=distanceFromCenter*2.;
    // create bands ever 1/8th of the screen
    uvRotation=mod(uvRotation,TAU/(8.*energyNormalized));
    // reverse rotation every other band
    if(mod(floor(distanceFromCenterNormalized),2.)==1.){
        uvRotation*=-1.;
    }
    uv=mat2(cos(uvRotation),-sin(uvRotation),sin(uvRotation),cos(uvRotation))*uv;
    // alter rotation based off of y-coordinate
    // if this pixel is far from the center of the image, reverse the rotation
    
    vec2 uv0=uv;
    vec3 finalColor=vec3(0.);
    for(float i=0.;i<3.;i++){
        uv=(fract(6.*uv*pow(.125,i))-.5);
        
        float d=length(uv)*exp(-length(uv0));
        
        vec3 col=palette(length(uv0)+i*.4+time*pow(spectralCentroid,i));
        float timeAndEnergy=((1.*time)+energyNormalized);
        // if(energyZScore>2.)timeAndEnergy*=2.;
        d=sin(d*8.+timeAndEnergy)/8.;
        
        d=abs(d);
        
        d=pow(.01/d,3.);
        
        finalColor+=col*d;
        
    }
    vec4 prevColor=getLastFrameColor(fragCoord.xy/resolution.xy);
    if(beat){
        // rotate hue by 90 degrees
        vec3 hsl=rgb2hsl(finalColor);
        hsl.x+=.25;
        vec3 finalColor=hsl2rgb(hsl);
        fragColor=mix(prevColor,vec4(finalColor,1.),.8);
        return;
    }
    vec4 preFinal=mix(prevColor,vec4(finalColor,1.),.5);
    // if prefinal is too light, darken it via hsl
    vec3 hsl=rgb2hsl(preFinal.rgb);
    if(hsl.z>.3){
        hsl.z-=.1;
        //rotate hue by 90 degrees
        hsl.x+=.25;
        preFinal.rgb=hsl2rgb(hsl);
    }
    fragColor=preFinal;
}

void main(void){
    mainImage(fragColor,gl_FragCoord.xy,time);
    
}
