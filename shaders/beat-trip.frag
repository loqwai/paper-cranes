#version 300 es
precision highp float;

#pragma glslify: import(./includes/basics.frag)
#pragma glslify: import(./includes/audio-uniforms.frag)
#pragma glslify: hsl2rgb = require(glsl-hsl2rgb)
#pragma glslify: rgb2hsl = require(./includes/rgb2hsl)

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
    mainImage(fragColor, gl_FragCoord.xy);
}
