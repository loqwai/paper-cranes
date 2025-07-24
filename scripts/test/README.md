# Paper Cranes Testing Infrastructure

This directory contains automated testing tools for Paper Cranes shaders.

## Test Scripts

### 1. capture-shader-media.js
Captures screenshots and video of a shader for documentation and analysis.

```bash
node capture-shader-media.js claude-generated/quantum-particles
```

Output structure:
```
screenshots/
└── quantum-particles/
    ├── screenshots/
    │   ├── quantum-particles-2025-07-24T10-30-00-000Z-frame-000.png
    │   ├── quantum-particles-2025-07-24T10-30-00-000Z-frame-001.png
    │   └── ...
    ├── videos/
    │   └── quantum-particles-2025-07-24T10-30-00-000Z.webm
    └── quantum-particles-2025-07-24T10-30-00-000Z-metadata.json
```

### 2. regression-test.js
Development-driven testing framework that captures baseline screenshots and compares future runs.

#### Capture Baseline
```bash
# Single shader
node regression-test.js baseline claude-generated/quantum-particles

# All shaders
node regression-test.js baseline all
```

#### Run Regression Test
```bash
# Single shader
node regression-test.js test claude-generated/quantum-particles

# All shaders
node regression-test.js test all
```

Output structure:
```
regression/
├── baselines/          # Original captures
├── comparisons/        # New captures to compare
└── diffs/             # Visual difference images
```

### 3. run-regression-demo.js
Quick demo of the regression testing system.

```bash
node run-regression-demo.js
```

### 4. all-shaders.js
Tests all Claude-generated shaders by taking multiple screenshots.

```bash
node all-shaders.js
```

### 5. shader-animation.js
Tests shader animation by capturing frames at different time intervals.

```bash
node shader-animation.js
```

## Testing Strategy

### Visual Regression Testing
1. **Baseline Capture**: Take reference screenshots with fixed parameters
2. **Regression Test**: Compare new captures against baseline
3. **Difference Analysis**: Highlight pixels that changed beyond threshold

### Key Features
- **Deterministic Testing**: Fixed knob values ensure consistent output
- **Temporal Testing**: Multiple frames capture animation behavior
- **Pixel-level Comparison**: Detects subtle rendering differences
- **Configurable Thresholds**: Adjust sensitivity for different use cases

### Best Practices
1. **Run baselines on clean state**: Ensure server is freshly started
2. **Use consistent timing**: Allow shaders to initialize before capture
3. **Set appropriate thresholds**: Animation shaders may need higher tolerance
4. **Review diffs visually**: Not all differences are bugs

## Installation

First install dependencies:
```bash
npm install
```

Required packages:
- `playwright` - Browser automation
- `pngjs` - PNG image processing
- `pixelmatch` - Pixel-level image comparison

## Common Issues

### Server needs restart
New shaders require server restart. The server auto-restarts via watch.

### Timing differences
Animations may have slight timing variations. Adjust threshold if needed.

### Platform differences
Different GPUs may render slightly differently. Consider platform-specific baselines.

## Future Enhancements

1. **Performance Metrics**: Track FPS and frame times
2. **Audio Input Testing**: Test with synthetic audio signals
3. **Cross-browser Testing**: Validate on Chrome, Firefox, Safari
4. **Mobile Testing**: Ensure shaders work on mobile devices
5. **CI Integration**: Automated testing on commits