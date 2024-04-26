#version 300 es
precision mediump float;

// Uniforms for audio features
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
uniform float spectralEntropyMin;
uniform float spectralEntropyMax;
uniform float spectralRoughnessNormalized;
uniform vec2 resolution;

out vec4 fragColor;


//return a 2d rotation matrix set by rotation in radians.
mat2 rot2(float r){float c=cos(r),s=sin(r);return mat2(c,s,-s,c);}

//return circle-circle-intersection.x; r.x=circle.left.radius;r.y=circle.right.radius;r.z=circles-centers.distance
//does not check for non-intersecticn cases! intersection.y is not important.
float cci(vec3 r){float d=r.z*2.;r*=r;return(r.x-r.y+r.z)/d;}

//return f[x] of a SeeSaw curve with [w]avelength and [a]mplitude; returns range [0..amp]
float SeeSaw(float x,float w,float a){return mod(x,w)*a;}
//set [a]mplitude = 1/[w]avelength
float SeeSaw2(float x,float w){return SeeSaw(x,w,1./w);}
///return sin(t), shifted to range [0...1]
float sinP(float t){return(sin(t)+1.)*.5;}



//As subroutine for TangentCapsule(), resolves a branching case;
//... Point [p] is either closest to one of the 2 circles, or closest to the tangent between the circles.
//a and b are tangent intersection points.
//sdline() calculates 2 lines that are orthogonal to a line trough a and b, and that goes trough a, or b.
//this creates 3 endless lines in a "H"-shaped-formation. Point [p] is in one of the 3 areas.
//sdline() is used as branching function to tell in what area of that "H"-shape [p] is.
//
//return signed distance of [p] to a line that goes trough [a] and is orthogonal to a line trough [a] and [b].
float sdline(vec2 p,vec2 a,vec2 b){mat2 m=rot2(-atan(b.x-a.x,b.y-a.y)); p*=m;a*=m;b*=m;return p.y-a.y;}

//show tangent intersections. You do not want this in your use case.
#define debug_show_intersections


//return distace of p to cylinder with rounded caps;
float TangentCapsule(vec2 p,vec3 h){h.x=max(h.x,h.y);//cheap safeguard enforces constrains
//h.x=left rasius, h.y=right rdius; h.z distance between sphere center
//h.x>=h.y>0.0 ! h.z>=h.x-h.y, else there is no tangent, and this function comes down to "distance to 2 circles".
 float s=h.x-h.y;float i=cci(vec3(s,vec2(h.z*.5)));//this is why h.x>h.y!
 vec2 a=vec2(i,sqrt(s*s-i*i));//a is the left boundary point between larger circle and cone.
 vec2 b=vec2(h.z,0)-a;        //b is "directional vector"
 vec2 n=normalize(vec2(b.y,-b.x));p.y=abs(p.y);//using symmetry.
#ifdef debug_show_intersections
 #define ap a-p-n*h.y)<.01)return 1.;//for debug below
 if (length(ap if (length(b+ap//show tangent intersections for debug
#endif
 #define mo if(sdline(p,a
 #define mi b.xy)<0.)return length(p
 mo,a+mi)-h.x;mo+b,a-mi-vec2(h.z,0))-h.y;//left circle //right circle
 p=(vec2(p.x-h.z,p.y)-b)*rot2(atan(b.y, b.x));//align down, simplify....
  //74 line instead of rot2( pi/2-atan(b.x, b.y)) you could simple write rot2(atan(b.y, b.x))
 return p.y-h.y;}//...rotate p around (h.z,0,0) by -atan(b.x,b.y)+quater and only return .y

// Modified mainImage function to use audio features
void mainImage(out vec4 r, in vec2 i) {
    r.a = 1.;
    vec2 p = i.xy / min(resolution.x, resolution.y);
    // rotate p over time
    p = p * rot2(time * 0.1);

    // Example of using audio features to influence the shader
    float dynamicRadius = (spectralCentroidNormalized/10.) * 0.5 + 0.5;
    float dynamicDistance = (spectralRoughnessNormalized * 0.002) + 0.8;
    float colorShift = spectralCentroidZScore;

    vec3 h = vec3(dynamicRadius, 0.3, dynamicDistance); // Modifying h based on audio features
    vec3 c = vec3(TangentCapsule(p, h));

    // Color manipulation based on audio features
    c.g = SeeSaw2(c.r, colorShift);
    c.b = SeeSaw2(length(p) - h.x, colorShift);
    p.r -= h.z;
    c.r = SeeSaw2(length(p) - h.y, colorShift);

    if(abs(c.g) < .04) c *= vec3(.5); // Dark border line
    r.rgb = c;
}

void main(void) {
    mainImage(fragColor, gl_FragCoord.xy);
}
