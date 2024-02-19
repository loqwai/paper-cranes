void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 st = fragCoord/iResolution.xy;
    float left = step(0.1,st.x);   // Similar to ( X greater than 0.1 )
    float bottom = step(0.1,st.y); // Similar to ( Y greater than 0.1 )
    vec3 color = vec3(left * bottom );
    fragColor = vec4(color,1.0);
  }
