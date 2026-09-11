// @fullscreen: true
// @mobile: true
// @tags: ambient, cyberpunk, cozy, warm, lava-lamp

// Simplex-like noise for organic blobs
float noise(vec3 p) {
  return sin(p.x * 0.5) * sin(p.y * 0.5) * sin(p.z * 0.5) +
         sin(p.x * 1.3 + p.z * 0.7) * sin(p.y * 1.1) * 0.5;
}

// Distance to blobs using noise
float blobDistance(vec3 p) {
  float blob = 0.0;
  blob += noise(p + vec3(iTime * 0.3)) * 0.4;
  blob += noise(p * 0.7 + vec3(iTime * 0.2, iTime * 0.15, 0.0)) * 0.3;
  blob += noise(p * 0.4 + vec3(0.0, iTime * 0.25, iTime * 0.1)) * 0.3;
  return blob;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
  vec2 uv = fragCoord / iResolution.xy;
  vec2 p = (uv - 0.5) * 2.0;

  // Aspect ratio correction
  p.x *= iResolution.x / iResolution.y;

  // Slower time for organic motion
  float t = iTime * 0.45;

  // Create organic blob movements with wave undulation
  vec3 blobPos1 = vec3(
    sin(t * 0.5) * 0.4 + sin(t * 0.2) * 0.1,
    cos(t * 0.3) * 0.3 + sin(t * 0.25) * 0.15,
    sin(t * 0.7) * 0.2
  );

  vec3 blobPos2 = vec3(
    cos(t * 0.4) * 0.35 + cos(t * 0.22) * 0.12,
    sin(t * 0.6) * 0.35 + cos(t * 0.28) * 0.12,
    cos(t * 0.5) * 0.25
  );

  vec3 blobPos3 = vec3(
    sin(t * 0.3 + 2.0) * 0.3 + sin(t * 0.24) * 0.08,
    cos(t * 0.4 + 1.5) * 0.4 + cos(t * 0.26) * 0.1,
    sin(t * 0.6 + 1.0) * 0.2
  );

  // Calculate distances to blob centers
  float d1 = distance(vec2(p), vec2(blobPos1));
  float d2 = distance(vec2(p), vec2(blobPos2));
  float d3 = distance(vec2(p), vec2(blobPos3));

  // Smooth blob falloff with added noise for organic look
  float blob1 = smoothstep(0.65, 0.0, d1 + blobDistance(vec3(p, t * 0.1)) * 0.15);
  float blob2 = smoothstep(0.48, 0.0, d2 + blobDistance(vec3(p, t * 0.15)) * 0.12);
  float blob3 = smoothstep(0.45, 0.0, d3 + blobDistance(vec3(p, t * 0.2)) * 0.1);

  // Combine blobs
  float blobMix = max(max(blob1, blob2), blob3);
  blobMix += blob1 * blob2 * 0.3;  // Blob intersection highlights
  blobMix += blob2 * blob3 * 0.25;

  // Color based on blob position and intensity
  vec3 col = vec3(0.0);

  // Deep reddy purple primary
  float deepHue = mix(0.95, 1.0, blob1);
  col += blob1 * hsl2rgb(vec3(deepHue, 0.9, 0.35 + blob1 * 0.25));

  // Medium purple secondary
  col += blob2 * hsl2rgb(vec3(0.8, 0.85, 0.4 + blob2 * 0.2));

  // Dark blue accent
  col += blob3 * hsl2rgb(vec3(0.65, 0.8, 0.35 + blob3 * 0.22));

  // Add subtle glow between blobs (blue-shifted)
  col += blobMix * 0.20 * hsl2rgb(vec3(0.65, 0.8, 0.25));

  // Vignette falloff
  float vignette = smoothstep(1.5, 0.0, length(p));
  col *= vignette;

  // Deep dark blue background
  vec3 bg = hsl2rgb(vec3(0.62, 0.85, 0.05));
  col = mix(bg, col, vignette * 0.9);

  // Warm gamma correction for cozy feel
  col = pow(col, vec3(0.88));

  // Slight bloom for lava lamp glow
  col += blobMix * 0.1;

  fragColor = vec4(col, 1.0);
}
