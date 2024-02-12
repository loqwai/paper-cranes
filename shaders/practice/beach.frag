uniform float knob_1;
uniform float knob_2;
// Plot a line on Y using a value between 0.0-1.0
float plot(vec2 st, float pct){
  const float lineWidth = 0.08;
  return  smoothstep( pct-lineWidth, pct, st.y) -
          smoothstep( pct, pct+lineWidth, st.y);
}

vec3 sun(vec2 uv){
  vec2 sunPos = vec2(-1.63, -0.48+(energyZScore/4.));
  float radius = 0.1;
  float dist = length(uv+sunPos);
  if(dist < radius) {
        return vec3(1.,1.,0.);
      }
}


vec3 water(vec2 uv) {
    uv = uv * 10.;
    float y = sin(uv.x + time)*spectralCentroidMedian*1.5;
    return vec3(0.,0.,step(uv.y,y));
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec3 col = vec3(0.);
    // Normalized pixel coordinates (from 0 to 1)
    vec2 uv = fragCoord/iResolution.xy;
    vec3 last = getLastFrameColor(uv).rgb;
    uv.y -= 0.5;
    uv *=2.;
    uv.y + 0.5;

    col=water(uv);
    if(col.b == 0.){
      col += sun(uv);
    } else {
      col = mix(col, last, 0.99);
    }
    // Output to screen
    fragColor = vec4(col,1.0);
}
