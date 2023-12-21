#version 300 es
precision mediump float;

uniform bool beat;
uniform vec2 resolution;
uniform float time;
uniform sampler2D prevFrame;// Image texture
uniform float spectralSpreadZScore;
uniform float spectralCentroidZScore;
uniform float energyZScore;
out vec4 fragColor;

vec4 getLastFrameColor(vec2 uv){
    // I don't know why, but the texture is always flipped vertically
    return texture(prevFrame,vec2(uv.x,1.-uv.y));
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
// Function to apply a dynamic and beat-reactive distortion effect
vec4 applyDistortion(vec2 uv,float time,bool beat){
    // Modify the hue rotation based on various factors
    float hueOffset=sin(uv.x*10.f+uv.y*10.f)*.5f;
    // float hueVariation = sin(time * spectralSpreadZScore) + cos(time * spectralCentroidZScore);
    
    // Beat-reactive hue rotation speed
    float hueRotationSpeed=beat?.5f:.1f;
    
    // Apply distortion
    float waveX=sin(uv.y*20.f+time*energyZScore)*.005f;
    float waveY=cos(uv.x*20.f+time*energyZScore)*.005f;
    if(beat){
        waveX*=5.f;
        waveY*=5.f;
    }
    vec2 distortedUv=uv+vec2(waveX,waveY);
    distortedUv=fract(distortedUv);
    
    // Sample the texture with distorted coordinates
    vec4 originalColor=texture(prevFrame,distortedUv);
    float grayPercent=getGrayPercent(originalColor);
    // the gray threshold is a function of time, and is beat-reactive. varies between 0.1 and 0.8
    float grayThreshold=1.-(energyZScore+3.)/3.;
    if(grayPercent>grayThreshold){
        // get the originalColor by the inverted distortion uv
        // and modulated by the sin of time
        // originalColor = texture(prevFrame, vec2(sin(time) - distortedUv.x, cos(time) - distortedUv.y));
        vec4 colorToMixIn=beat?vec4(1.f,0.f,0.f,.02f):vec4(0.f,0.f,1.f,.02f);
        originalColor=mix(originalColor,colorToMixIn,.1f);
    }
    vec3 hslColor=rgb2hsl(originalColor.rgb);
    //if the spectralSpreadZScore is greater than 0.5, make things greener
    //if the spectralCentroidZScore is greater than 0.5, make things redder
    if(spectralCentroidZScore>2.5f){
        hslColor.x+=.1f;
    }
    if(spectralSpreadZScore>2.5f){
        hslColor.x-=.1f;
    }
    hslColor.x+=hueOffset+hueRotationSpeed*time;// Rotate the hue
    // if there's a beat, make things more saturated
    hslColor.x=fract(hslColor.x);// Ensure hue stays in the [0, 1] range
    
    vec3 rgbColor=hsl2rgb(hslColor);
    return vec4(rgbColor,1.f);
}

void mainImage(out vec4 fragColor,in vec2 fragCoord){
    vec2 uv=fragCoord.xy/resolution.xy;
    
    // Apply the beat-reactive distortion and color effect
    fragColor=applyDistortion(uv,time,beat);
}

void main(void){
    vec4 color=vec4(0.f,0.f,0.f,1.f);
    mainImage(color,gl_FragCoord.xy);
    fragColor=color;
}
