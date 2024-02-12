uniform float knob_1;

// Plot a line on Y using a value between 0.0-1.0
float plot(vec2 st, float pct){
  float lineWidth = energyZScore;
  return  smoothstep( pct-lineWidth, pct, st.y) -
          smoothstep( pct, pct+lineWidth, st.y);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{

    vec3 col = vec3(0.);

    // center plot on y axis
    vec2 uv = fragCoord/iResolution.xy;
    vec3 l = getLastFrameColor(uv.yx).rgb;
    uv.y -= 1.;
    uv *=2.;
    uv.y +=1.;
    uv *=10.;

    // line we're plotting
    float y = sin(uv.x*sinh(time*energy));

    float pt = plot(uv, y);
    col=pt*vec3(0.0,1.0,0.0);


    if(l.g > 0.) {
        col.r = spectralCentroid;
        col.b = spectralCentroidMean;
      }
    // Output to screen
    fragColor = vec4(col,1.0);
}
