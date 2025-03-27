void mainImage(out vec4 fragColor, vec2 fragCoord) {
  vec2 uv = fragCoord.xy/resolution.xy;

  // Get the current time and add a small increment to it
  // Using a slower increment to control speed
  float t = getTime() + 0.016 * 0.2; // Only add a small fraction of a frame time
  setTime(t);

  // Visualize the time value
  // Use a slower rotation speed
  float angle = t * 0.2; // Reduced rotation speed
  vec2 rotatedUV = vec2(
    uv.x * cos(angle) - uv.y * sin(angle),
    uv.x * sin(angle) + uv.y * cos(angle)
  );

  // Use a simple checkerboard pattern with the rotated coordinates
  float checkerSize = 5.0; // Reduced checker density
  vec2 checker = floor(rotatedUV * checkerSize);
  float pattern = mod(checker.x + checker.y, 2.0);

  // Visualize time as a growing circle
  float radius = mod(t, 5.0) / 5.0; // Between 0 and 1, cycles every 5 seconds
  float circle = smoothstep(radius, radius - 0.05, distance(uv, vec2(0.5)));

  // Final color
  vec3 color = mix(
    vec3(0.3, 0.0, 0.5), // Dark purple
    vec3(1.0, 0.7, 0.2), // Orange
    pattern
  );

  // Add the circle
  color = mix(color, vec3(0.0, 1.0, 0.5), circle);

  // Display the current time value near the bottom
  float timeBar = smoothstep(0.02, 0.0, abs(uv.y - 0.1));
  timeBar *= smoothstep(mod(t, 10.0)/10.0, mod(t, 10.0)/10.0 - 0.01, uv.x);
  color = mix(color, vec3(1.0), timeBar);

  fragColor = vec4(color, 1.0);
}
