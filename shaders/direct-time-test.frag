void mainImage(out vec4 fragColor, vec2 fragCoord) {
  vec2 uv = fragCoord.xy/resolution.xy;

  // Directly use _time - the global time uniform
  // No setTime call at all
  float t = _time;

  // Create a simple gradient based on time to show movement
  float rColor = sin(uv.x * 10.0 + t) * 0.5 + 0.5;
  float gColor = cos(uv.y * 8.0 - t * 1.3) * 0.5 + 0.5;
  float bColor = sin(uv.x * 4.0 + uv.y * 4.0 + t * 0.7) * 0.5 + 0.5;

  // Final color
  vec3 color = vec3(rColor, gColor, bColor);

  // Create a moving circle
  float radius = 0.2 + 0.1 * sin(t);
  float circle = smoothstep(radius, radius - 0.02, distance(uv, vec2(0.5)));
  color = mix(color, vec3(1.0), circle * 0.5);

  // Create a digital time display in the bottom-left
  if (fragCoord.x < 120.0 && fragCoord.y < 30.0) {
    // Show background for time
    color = vec3(0.0);

    // Create a simple time meter
    if (fragCoord.x < mod(t * 20.0, 120.0)) {
      color = vec3(1.0, 0.0, 0.0);
    }
  }

  fragColor = vec4(color, 1.0);
}
