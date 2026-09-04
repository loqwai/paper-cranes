// @fullscreen: true
// LAB PROBE (H2 / lab/tomoe). Draws the mon SDF PNG UNFOLDED, exactly as beadDist
// sees it, to settle the UNPACK_FLIP_Y question. Left half: raw RGB. Right half: the
// G-channel SDF thresholded at 0.5 (the bead boundary). Not art. Do not ship.
void mainImage(out vec4 fragColor, in vec2 fragCoord){
    vec2 uv = fragCoord / iResolution.xy;
    vec4 t = getInitialFrameColor(uv);
    // d < 0 => inside the bead, matching beadDist's sign convention
    float d = (t.g - 0.5) * 2.0;
    vec3 col = (uv.x < 0.5) ? t.rgb
                            : (d < 0.0 ? vec3(1.0, 0.35, 0.0) : vec3(0.04));
    // a red tick in the texture-space TOP-RIGHT corner so orientation is unambiguous
    if (uv.x > 0.93 && uv.y > 0.93) col = vec3(1.0, 0.0, 0.0);
    fragColor = vec4(col, 1.0);
}
