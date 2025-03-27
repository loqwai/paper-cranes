void mainImage(out vec4 fragColor, vec2 fragCoord) {
  vec2 uv = fragCoord.xy/resolution.xy;

  // We use _time which already advances automatically each frame
  // Adding a constant offset just shifts the starting point
  setTime(_time + 1.0);

  // Get the adjusted time value for our calculations
  float t = getTime();

  // Create a more noticeable movement
  float speed = 1.0;
  vec2 offsetUV = uv + vec2(
    sin(t * speed) * 0.2,    // More amplitude (0.2 instead of 0.1)
    cos(t * speed * 0.7) * 0.2
  );

  // Add a bit of scaling animation too for more visible motion
  float scale = 1.0 + 0.2 * sin(t * 0.5);
  offsetUV = (offsetUV - 0.5) / scale + 0.5;

  // Use the modified UV coordinates to sample from the initial texture
  fragColor = getInitialFrameColor(offsetUV);

  // Add a moving bar at the top showing the time progress
  float timeIndicator = mod(t, 5.0) / 5.0;
  if (uv.y > 0.95 && uv.x < timeIndicator) {
    fragColor = mix(fragColor, vec4(1.0, 0.5, 0.0, 1.0), 0.5);
  }

  // Also add time value as a text display
  // Show time value in bottom left
  if (fragCoord.x < 100.0 && fragCoord.y < 30.0) {
    // Show background for time
    fragColor = vec4(0.1, 0.1, 0.1, 1.0);

    // Show current time as a progress bar
    if (fragCoord.x < t * 10.0) {
      fragColor = vec4(1.0, 0.5, 0.0, 1.0);
    }
  }
}
