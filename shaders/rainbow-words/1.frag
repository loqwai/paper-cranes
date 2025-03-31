#define localTime (iTime/1.)
vec3 rainbowPalette(float t) {
  // Returns a psychedelic rainbow color cycle.
  return 0.5 + 0.5 * cos(6.2831*(t + vec3(0.0, 0.33, 0.67)));
}

// Plasma-like mapping function
mat2 m(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

float map(vec3 p) {
  p.xz *= m(localTime * 0.4);
  p.xy *= m(localTime * 0.3);
  vec3 q = p * 2.0 + localTime;
  return length(p + vec3(sin(localTime * 0.7))) * log(length(p) + 1.0) +
         sin(q.x + sin(q.z + sin(q.y))) * 0.5 - 1.0;
}

float getMask(vec2 uv) {
  // Convert the initial image to a binary mask:
  // Black (text) becomes 1, white becomes 0.
  float m = 1.0 - dot(getInitialFrameColor(uv).rgb, vec3(0.333));
  return smoothstep(0.4, 0.6, m); // Smoother text edges
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  // Normalize UV coordinates
  vec2 uv = fragCoord.xy / iResolution.xy;
  float aspectRatio = iResolution.x / iResolution.y;

  // Scale UV coordinates to maintain aspect ratio
  vec2 scaledUV = uv;
  if (aspectRatio > 1.0) {
    scaledUV.x = (uv.x - 0.5) * aspectRatio + 0.5;
  } else {
    scaledUV.y = (uv.y - 0.5) / aspectRatio + 0.5;
  }

  // Base image color and binary text mask.
  vec3 baseColor = getInitialFrameColor(uv).rgb;
  float baseMask = getMask(uv);

  // Get last frame's color for flame effect
  vec3 lastFrame = getLastFrameColor(uv).rgb;

  // Outline accumulator.
  vec3 outlineColor = vec3(0.0);
  vec3 flameColor = vec3(0.0);

  // Calculate distance from text center
  vec2 center = vec2(0.5, 0.5);
  float distFromCenter = length(scaledUV - center);

  // Create radiating effect
  float radiationFactor = smoothstep(0.0, 0.5, distFromCenter);
  float radiationPhase = radiationFactor * 6.2831 + localTime * 2.0;

  // Smooth zoom animation with plasma influence
  float zoomPhase = animateEaseInOutExpo(sin(localTime * 0.5)) * 0.5 + 0.5;
  float maxSteps = 12.0;
  float stepVariation = sin(localTime * 0.5) * 4.0;
  float currentSteps = maxSteps + stepVariation;
  float zoomStep = 0.1 - (sin(localTime*0.5) * 0.005);

  // Use continuous steps instead of discrete
  for(float i = 1.0; i <= currentSteps; i += 0.5) {
    float scale = 1.0 - i * zoomStep;
    vec2 zoomedUV = (scaledUV - center) / scale + center;

    // Add plasma-like warping with radial influence
    vec3 p = vec3(zoomedUV / 2.0 - 1.0, 0.0);
    float rz = map(p);
    float f = clamp((rz - map(p + 0.1)) * 0.5, -0.1, 1.0);

    // Apply radial warping
    float radialWarp = sin(radiationPhase + i * 0.5) * 0.2;
    vec2 warpedUV = zoomedUV + normalize(zoomedUV - center) * radialWarp * f;

    float zoomMask = getMask(warpedUV);

    // Smoother ring transition with plasma influence
    float ring = smoothstep(0.0, 0.1, clamp(zoomMask - baseMask, 0.0, 1.0)) * f;

    // Each ring gets a unique rainbow color with plasma influence
    vec3 ringColor = rainbowPalette(i / currentSteps + localTime * 0.1 + rz * 0.1 + radiationPhase * 0.1);

    // Smooth falloff based on distance from center
    float falloff = smoothstep(1.0, 0.0, i / currentSteps);

    // Accumulate with smooth transitions and plasma influence
    outlineColor -= ring * 2.0 * ringColor * falloff * (1.0 + sin(radiationPhase) * 0.3);

    // Create enhanced flame effect using last frame
    vec2 flameUV = warpedUV;
    float warp = ring * 0.02 * (1.0 + f);
    flameUV += normalize(flameUV - center) * warp * sin(radiationPhase + i);

    vec3 lastColor = getLastFrameColor(flameUV).rgb;
    vec3 flameRingColor = mix(ringColor, lastColor, 0.5);

    // Enhanced flame intensity with plasma influence
    float flameIntensity = ring * falloff * (1.0 + f) * (1.0 + sin(radiationPhase) * 0.3);
    flameColor += flameRingColor * flameIntensity * (1.0 + sin(localTime * 3.0 + i + rz) * 0.3);
  }

  // Smooth text-to-flame transition with plasma influence
  float invText = smoothstep(0.0, 0.1, 1.0 - baseMask);
  vec3 finalColor = mix(baseColor, baseColor + outlineColor + flameColor * 2.0, invText);

  // Enhanced bloom with plasma influence
  finalColor *= 1.0 + length(flameColor) * 0.5 * smoothstep(0.0, 0.5, invText);

  // Add subtle color shifting based on plasma mapping and radiation
  vec3 p = vec3(scaledUV * 2.0 - 1.0, 0.0);
  float rz = map(p);
  finalColor = mix(finalColor, rainbowPalette(rz * 0.1 + radiationPhase * 0.1), 0.1);

  fragColor = vec4(finalColor, 1.0);
}
