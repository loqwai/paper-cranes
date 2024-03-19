uniform float knob_1;

#define A (energy+1.)
#define B (energyNormalized+1.)
#define M energyZScore/10.
#define C spectralEntropy*1.5
#define D energyNormalized

vec4 render(vec2 uv){
  if(frame % 10 == 0){
    return vec4(0.);
  }
  return vec4(1.);
}
void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = fragCoord/iResolution.xy;
    // fix aspect ratio
    uv.x *= iResolution.x/iResolution.y;
    fragColor = render(uv);
}
