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
    
    vec3 a=vec3(0.,spectralCentroid,.500);
    vec3 b=vec3(2.,.500,.490);
    vec3 c=vec3(2.,2.,.500);
    vec3 d=vec3(0.,.667,.500);
    
    return a+b*cos(TAU*(c*t+d));
}

void mainImage(out vec4 fragColor,in vec2 fragCoord)
{
    vec2 uv=(fragCoord*2.-resolution.xy)/resolution.y;
    vec2 uv0=uv;
    vec3 finalColor=vec3(0.);
    
    for(float i=0.;i<200.;i++){
        uv=(fract(6.*uv*pow(.125,i))-.5);
        
        float d=length(uv)*exp(-length(uv0));
        
        vec3 col=palette(length(uv0)+i*.4+time*pow(.4,i));
        
        d=sin(d*8.+time*energyNormalized)/8.;
        
        d=abs(d);
        
        d=pow(.01/d,3.);
        
        finalColor+=col*d;
        
    }
    
    fragColor=vec4(finalColor,1.);
}

void main(void){
    vec4 color=vec4(0.f,0.f,0.f,1.f);
    mainImage(color,gl_FragCoord.xy);
    fragColor=color;
}
