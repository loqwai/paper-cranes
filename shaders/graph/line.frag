#define LINE_WIDTH 0.5
#define SMOOTH_WIDTH 0.25
#define ULTRA_DROP_COUNT 5
#define PROBE_A 0.3
#define PROBE_B knob_1
#define SMOOTHING_FACTOR 0.151  // Lower = smoother, but more latency
#define VERTICAL_OFFSET 0.5  // Centered in screen
#define SCALE 0.4  // Scale factor that keeps graph visible

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / resolution.xy;

    // Background - Shift everything to the left
    if (uv.x < 0.99) {
        vec2 prevUV = uv;
        prevUV.x += 1.0 / resolution.x;
        fragColor = getLastFrameColor(prevUV);
    } else {
        fragColor = vec4(0.0, 0.0, 0.0, 1.0);
    }

    // Plot each feature on the rightmost column with a unique color
    if (uv.x > 0.99) {
        // Convert values to UV space
        float bassPos = VERTICAL_OFFSET + (bass * SCALE);
        float treblePos = VERTICAL_OFFSET + (treble * SCALE);
        float pitchPos = VERTICAL_OFFSET + (pitchClass * SCALE);
        float midsPos = VERTICAL_OFFSET + (mids * SCALE);

        // Thinner lines for better visibility
        float lineWidth = 0.005;

        // Draw lines using UV space
        if (abs(uv.y - bassPos) < lineWidth) {
            fragColor = vec4(1.0, 0.0, 0.0, 1.0);  // Red for bass
        } else if (abs(uv.y - treblePos) < lineWidth) {
            fragColor = vec4(0.0, 1.0, 0.0, 1.0);  // Green for treble
        } else if (abs(uv.y - pitchPos) < lineWidth) {
            fragColor = vec4(0.0, 0.0, 1.0, 1.0);  // Blue for pitch
        } else if (abs(uv.y - midsPos) < lineWidth) {
            fragColor = vec4(1.0, 1.0, 0.0, 1.0);  // Yellow for mids
        }
    }
}
