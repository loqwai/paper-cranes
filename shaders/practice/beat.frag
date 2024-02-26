#ifndef PAPER_CRANES
    float beat = 0.0;
#endif

void mainImage(out vec4 color,in vec2 fragCoord){
    vec2 resolution=iResolution.xy;
    // Adjusted coordinates to center the circle
    vec2 uv=(vec2(fragCoord.x,resolution.y-fragCoord.y)/resolution.xy-.5)*2.;
    float radius=beat?.4:.2;// Larger radius when there's a beat

    // Calculate the distance from the center
    float dist=length(uv);

    // Determine if we're inside the circle
    if(dist<radius){
        // Inside the circle
        color=beat?vec4(1.,0.,0.,1.):vec4(0.,0.,1.,1.);// Red if beat is true, blue otherwise
        return;
    }
    color=vec4(0.,0.,0.,0.);// Transparent
}
