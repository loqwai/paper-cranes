//http://localhost:6969/?shader=rainbow-words/3&image=images/sibi.png
vec3 rainbowPalette(float t) {
  // Returns a psychedelic rainbow color cycle.
  return 0.5 + 0.5 * cos(6.2831*(t + vec3(0.0, 0.33, 0.67)));
}

float getMask(vec2 uv) {
  // Convert the initial image to a binary mask:
  // Black (text) becomes 1, white becomes 0.
  float m = 1.0 - dot(getInitialFrameColor(uv).rgb, vec3(0.333));
  return smoothstep(0.4, 0.6, m); // Smoother text edges
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  // Normalize UV coordinates.
  vec2 uv = fragCoord.xy / iResolution.xy;
  // Base image color and binary text mask.
  vec3 baseColor = getInitialFrameColor(uv).rgb;
  float baseMask = getMask(uv);

  // Get last frame's color for flame effect
  vec3 lastFrame = getLastFrameColor(uv).rgb;

  // Outline accumulator.
  vec3 outlineColor = vec3(0.0);
  vec3 flameColor = vec3(0.0);

  // Smoother zoom animation
  float zoomPhase = sin(iTime * 0.5) * 0.5 + 0.5; // 0 to 1
  int steps = 12 + int(sin(iTime * 0.5) * 4.0); // Smoother step variation
  float zoomStep = -0.01 - (sin(iTime * 0.5) * 0.05); // Smoother zoom variation

  for (int i = 1; i <= steps; i++) {
    // Zoom in by using a scale factor less than 1 (magnifying the text).
    float scale = 1.0 - float(i) * zoomStep;
    // Scale about the center (assumed at 0.5,0.5).
    vec2 zoomedUV = (uv - vec2(0.5)) / scale + vec2(0.5);
    float zoomMask = getMask(zoomedUV);

    // Smoother ring transition
    float ring = smoothstep(0.0, 0.1, clamp(zoomMask - baseMask, 0.0, 1.0));

    // Each ring gets a unique rainbow color.
    vec3 ringColor = rainbowPalette(float(i) / float(steps) + iTime * 0.1);

    // Accumulate without overwriting: add the ring's color with smooth falloff
    outlineColor -= ring * 2.0 * ringColor * smoothstep(1.0, 0.0, float(i) / float(steps));

    // Create flame effect using last frame
    vec2 flameUV = zoomedUV;
    // Add some warping based on the ring
    float warp = ring * 0.02;
    flameUV += vec2(
      sin(zoomedUV.y * 10.0 + iTime * 2.0) * warp,
      cos(zoomedUV.x * 10.0 + iTime * 2.0) * warp
    );

    // Get last frame color at warped position
    vec3 lastColor = getLastFrameColor(flameUV).rgb;

    // Create flame color based on ring and last frame with smooth falloff
    vec3 flameRingColor = mix(ringColor, lastColor, 0.5);
    float flameIntensity = ring * smoothstep(1.0, 0.0, float(i) / float(steps));
    flameColor += flameRingColor * flameIntensity * (1.0 + sin(iTime * 3.0 + float(i)) * 0.3);
  }

  // Only draw the outline outside the text (where baseMask is 0).
  float invText = smoothstep(0.0, 0.1, 1.0 - baseMask);
  vec3 finalColor = mix(baseColor, baseColor + outlineColor + flameColor * 2.0, invText);

  // Add some bloom with smoother falloff
  finalColor *= 1.0 + length(flameColor) * 0.5 * smoothstep(0.0, 0.5, invText);

  fragColor = vec4(finalColor, 1.0);
}
