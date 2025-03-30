# Shader Controllers

Shader Controllers are JavaScript modules that provide dynamic, programmable control over shader visualization. They allow for complex animations, state management, and custom audio reactivity beyond what's possible in GLSL alone.

## How It Works

1. A controller is loaded via the `controller` query parameter: `?controller=path/to/controller`
2. The controller path can be:
    - A local path relative to the `/controllers` directory (`example` or `example.js`)
    - A full URL to a remote JavaScript file (`https://example.com/my-controller.js`)
3. The controller can be implemented in two ways:
    - **Simple**: Export a function directly that will be called each frame
    - **Advanced**: Export a `make()` function that initializes the controller and returns a function
4. The controller function is called on each frame, receiving the flattened features
5. The returned values are stored in `window.cranes.controllerFeatures`
6. These values are incorporated into the feature precedence chain

## Feature Precedence

Features are applied in the following order of precedence (lowest to highest):

1. `measuredAudioFeatures` - Raw audio analysis data from microphone
2. `controllerFeatures` - Values returned by the controller function
3. URL parameters - From the query string
4. `manualFeatures` - Set programmatically or via UI
5. `messageParams` - Inter-component communication

This means controllers can build on top of audio data, but their values can be overridden by URL parameters, and manually set features have the highest precedence (except for message parameters).

Each of these sources is stored separately in the `window.cranes` object and merged by the `flattenFeatures()` function when needed.

## Creating a Controller

### Option 1: Simple Function-Based Controller

Export a function directly from your module:

```js
// controllers/simple.js
// State is kept in module scope
let rotation = 0
let color = 0

// Export the controller function directly
export default function controller(features) {
    // Update state
    rotation += 0.01 * (1 + features.bassNormalized)
    color = (color + 0.005) % 1.0

    // Return values for shader
    return {
        myRotation: rotation,
        myColor: color,
        customBeat: features.bassNormalized > 0.8
    }
}
```

### Option 2: Make-Based Controller

Export a `make()` function that returns a controller function:

```js
// controllers/advanced.js
export function make(cranes) {
    // Initialize with access to global state
    console.log("Initializing with:", cranes)

    // Create state in closure
    const state = {
        rotation: 0,
        color: 0
    }

    // Return the controller function
    return function controller(features) {
        // Update state
        state.rotation += 0.01 * (1 + features.bassNormalized)
        state.color = (state.color + 0.005) % 1.0

        // Return values for shader
        return {
            myRotation: state.rotation,
            myColor: state.color,
            customBeat: features.bassNormalized > 0.8
        }
    }
}
```

## Using Controller Values in Your Shader

In your shader, directly use the uniform values added by the controller:

```glsl
// Any shader (.frag file)
#define ROTATION myRotation
#define COLOR myColor

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = (fragCoord.xy - 0.5 * resolution.xy) / resolution.y;

  // Rotate using controller value
  float c = cos(ROTATION), s = sin(ROTATION);
  uv = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);

  // Use controller color
  vec3 color = vec3(0.5 + 0.5 * sin(COLOR * 6.28 + uv.x),
                    0.5 + 0.5 * sin(COLOR * 6.28 + 2.0 + uv.y),
                    0.5 + 0.5 * sin(COLOR * 6.28 + 4.0));

  // Handle custom beat
  if (customBeat) {
    color += vec3(0.2);
  }

  fragColor = vec4(color, 1.0);
}
```

## Examples

Two controller examples are provided:

1. **Simple function controller**: `controllers/simple.js`

    - Exports a controller function directly
    - State is kept in module scope variables
    - Use: `?shader=controller-example&controller=simple`

2. **Make-based controller**: `controllers/example.js`
    - Uses the advanced `make()` pattern
    - State is encapsulated in closures
    - Has access to cranes object for initialization
    - Use: `?shader=controller-example&controller=example`

## When to Use Each Approach

- **Simple Function Controller**: For simpler controllers that don't need initialization
- **Make-Based Controller**: When you need:
    - Initialization with access to global state
    - More encapsulation of state
    - More complex setup or resource loading

## Advanced Usage

- **State Management**: Store complex state that persists between frames
- **Physics Simulation**: Calculate physics that would be difficult in GLSL
- **Custom Audio Analysis**: Create derivative audio metrics tailored to your visualization
- **Sequencing**: Create timed sequences of effects and animations
- **Network Effects**: Load external data and incorporate it into visualizations
- **Performance Optimization**: Offload complex calculations from shaders to JavaScript
