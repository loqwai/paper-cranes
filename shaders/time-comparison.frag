void mainImage(out vec4 fragColor, vec2 fragCoord) {
  // Set a custom time with an offset from global time
  setTime(_time + 1.0);

  // Normalized coordinates
  vec2 uv = fragCoord/resolution.xy;

  // Get time values
  float customTime = getTime();
  float globalTime = _time; // Using _time directly instead of iTime

  // Display exact time values and difference
  vec3 color;

  // Create the base colors (different for each half)
  vec3 leftColor = vec3(0.8, 0.2, 0.3); // Reddish for custom time
  vec3 rightColor = vec3(0.2, 0.3, 0.8); // Bluish for global time

  // Determine which side we're on
  vec3 baseColor = (uv.x < 0.5) ? leftColor : rightColor;

  // Calculate brightness oscillation (0.2 to 1.0 range)
  float leftBrightness = 0.2 + 0.8 * (0.5 + 0.5 * sin(customTime * 2.0));
  float rightBrightness = 0.2 + 0.8 * (0.5 + 0.5 * sin(globalTime * 2.0));

  // Apply brightness based on which side we're on
  float brightness = (uv.x < 0.5) ? leftBrightness : rightBrightness;
  color = baseColor * brightness;

  // Add dividing line
  if (abs(uv.x - 0.5) < 0.002) {
    color = vec3(1.0);
  }

  // Add labels at top
  if (uv.y > 0.95) {
    color = vec3(0.2);
    if (uv.x < 0.48) { // "getTime" label on left
      if ((uv.x > 0.2 && uv.x < 0.45) && (uv.y > 0.96)) {
        color = vec3(1.0);
      }
    } else if (uv.x > 0.52) { // "iTime" label on right
      if ((uv.x > 0.55 && uv.x < 0.8) && (uv.y > 0.96)) {
        color = vec3(1.0);
      }
    }
  }

  // Display precise time difference in the middle bottom
  if (uv.y < 0.08 && uv.x > 0.4 && uv.x < 0.6) {
    color = vec3(0.2);
    // Calculate difference
    float diff = abs(customTime - globalTime);
    // Visualize as a bar
    if (uv.x > 0.5 - diff && uv.x < 0.5 + diff) {
      color = vec3(1.0, 1.0, 0.0); // Yellow for difference
    }
  }

  // Add digital time displays at bottom
  if (uv.y < 0.08 && !(uv.x > 0.4 && uv.x < 0.6)) {
    if (uv.x < 0.4) {
      // Left side - getTime() display
      float timeValue = mod(customTime, 10.0); // Show modulo 10 seconds
      if (uv.x < timeValue * 0.04) {
        color = mix(color, vec3(1.0), 0.7);
      }
    } else if (uv.x > 0.6) {
      // Right side - iTime display
      float timeValue = mod(globalTime, 10.0); // Show modulo 10 seconds
      if (uv.x > 0.6 && uv.x < 0.6 + timeValue * 0.04) {
        color = mix(color, vec3(1.0), 0.7);
      }
    }
  }

  // Create pulsing circles in each half to better visualize timing
  vec2 leftCenter = vec2(0.25, 0.5);
  vec2 rightCenter = vec2(0.75, 0.5);

  float leftRadius = 0.1 + 0.05 * sin(customTime * 3.0);
  float rightRadius = 0.1 + 0.05 * sin(globalTime * 3.0);

  float leftCircle = 1.0 - smoothstep(leftRadius - 0.01, leftRadius, length(uv - leftCenter));
  float rightCircle = 1.0 - smoothstep(rightRadius - 0.01, rightRadius, length(uv - rightCenter));

  // Apply circles
  if (uv.x < 0.5) {
    color = mix(color, vec3(1.0), leftCircle * 0.7);
  } else {
    color = mix(color, vec3(1.0), rightCircle * 0.7);
  }

  fragColor = vec4(color, 1.0);
}
