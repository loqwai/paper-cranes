void mainImage(out vec4 fragColor, vec2 fragCoord) {
  // Just offset the global time by 0.5 seconds
  // This should result in the same motion as the global time
  // but with all animations shifted forward by 0.5 seconds
  setTime(_time + 0.5);

  // Normalized coordinates
  vec2 uv = fragCoord/iResolution.xy;

  // Get our custom time
  float t = getTime();

  // Create a simple pattern that clearly shows the time offset

  // A cycling color with time
  vec3 color = 0.5 + 0.5 * cos(t + uv.xyx + vec3(0,2,4));

  // Add a clearly moving element - a pulsing circle
  float pulse = 0.5 + 0.5 * sin(t * 2.0);
  float circle = smoothstep(0.3 * pulse, 0.29 * pulse, length(uv - 0.5));
  color = mix(color, vec3(1.0), circle * 0.5);

  // Add time display
  if (uv.y < 0.1 && uv.x < 0.3) {
    // Show the _time for comparison
    if (uv.y < 0.05) {
      // Raw time (_time)
      float rawTime = mod(_time, 2.0) / 2.0;
      if (uv.x < rawTime) {
        color = vec3(1.0, 0.0, 0.0); // Red for raw time
      }
    } else {
      // Custom time (getTime())
      float customTime = mod(t, 2.0) / 2.0;
      if (uv.x < customTime) {
        color = vec3(0.0, 1.0, 0.0); // Green for custom time
      }
    }
  }

  fragColor = vec4(color, 1.0);
}
