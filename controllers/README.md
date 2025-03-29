# Shader Controllers

Shader Controllers are JavaScript modules that provide dynamic, programmable control over shader visualization. They allow for complex animations, state management, and custom audio reactivity beyond what's possible in GLSL alone.

## How It Works

1. A controller is loaded via the `controller` query parameter: `?controller=path/to/controller`
2. The controller path can be:
    - A local path relative to the `/controllers` directory (`example` or `example.js`)
    - A full URL to a remote JavaScript file (`https://example.com/my-controller.js`)
3. The controller exports a `make()` function that initializes the controller and returns a controller function
4. The controller function is called on each frame, receiving the flattened features
5. The returned values are stored in `window.cranes.controllerFeatures`
6. These values are incorporated into the feature precedence chain

## Feature Precedence

Features are applied in the following order of precedence (lowest to highest):

1. Audio features (from microphone processing)
2. Controller features (from controller's returned values)
3. URL parameters (from the query string)
4. Manual features (from UI or programmatic changes)
5. Message parameters (from inter-component communication)

This means that URL parameters will override controller features, and manual features will override URL parameters.

## Creating a Controller

Create a JavaScript module that exports a `make()` function:

```js
// controllers/my-controller.js
export function make(cranes) {
    // Initialize controller state
    const state = {
        rotation: 0,
        color: 0
    }

    // Return the controller function that will be called each frame
    return function controller(features) {
        // Update controller state
        state.rotation += 0.01 * (1 + features.bassNormalized)
        state.color = (state.color + 0.005) % 1.0

        // Return values that will be available to shaders
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

## Example

See `controllers/example.js` for a complete working example.

To use the example, open:

```
/?shader=controller-example&controller=example
```

## Advanced Usage

- **State Management**: Store complex state that persists between frames
- **Physics Simulation**: Calculate physics that would be difficult in GLSL
- **Custom Audio Analysis**: Create derivative audio metrics tailored to your visualization
- **Sequencing**: Create timed sequences of effects and animations
- **Network Effects**: Load external data and incorporate it into visualizations
- **Performance Optimization**: Offload complex calculations from shaders to JavaScript
