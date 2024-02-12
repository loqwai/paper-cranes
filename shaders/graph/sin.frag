uniform float knob_1;

// Plot a line on Y using a value between 0.0-1.0
float plot(vec2 st, float pct){
  const float lineWidth = 0.08;
  return  smoothstep( pct-lineWidth, pct, st.y) -
          smoothstep( pct, pct+lineWidth, st.y);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // Normalized pixel coordinates (from 0 to 1)
    vec2 uv = fragCoord/iResolution.xy;
    uv.y -= 1.;
    uv *=2.;
    uv.y +=1.;
    uv *=10.;
    float y = sin(uv.x);
    vec3 col = vec3(0.);
    float pt = plot(uv, y);
    col=pt*vec3(0.0,1.0,0.0);
    // Output to screen
    fragColor = vec4(col,1.0);
}
