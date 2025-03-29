# Shader Controllers

Shader Controllers are JavaScript modules that provide dynamic, programmable control over shader visualization. They allow for complex animations, state management, and custom audio reactivity that would be difficult to achieve in GLSL alone.

## How It Works

1. A controller is loaded via the `controller` query parameter: `?controller=path/to/controller`
2. The controller path can be:
    - A local path relative to the `/shaders` directory (`mycontroller` or `mycontroller.js`)
    - A full URL to a remote JavaScript file (`https://example.com/mycontroller.js`)
3. The controller exports a `makeRender` function that initializes the controller and returns a `render` function
4. The `render` function is called on each frame, receiving the global `window.cranes` object
5. Any values returned by `render` are merged into the global state

## Creating a Controller

Create a JavaScript module that exports a `makeRender` function:

```js
// Example controller: shaders/my-controller.js
export function makeRender(cranes) {
    // Initialize controller state
    const state = {
        rotation: 0,
        color: 0
    }

    // Return a render function that will be called each frame
    return function render(cranes) {
        // Get access to audio features
        const { measuredAudioFeatures: features } = cranes

        // Update controller state
        state.rotation += 0.01 * (1 + (features.bassNormalized || 0))
        state.color = (state.color + 0.005) % 1.0

        // Return values to be merged into global state
        return {
            manualFeatures: {
                // These will be accessible as uniforms in the shader
                myRotation: state.rotation,
                myColor: state.color,
                customBeat: features.bassNormalized > 0.8
            }
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

See `controller-example.js` and `controller-example.frag` for a complete working example.

To use the example, open:

```
/?shader=controller-example&controller=controller-example
```

## Advanced Usage

- **State Management**: Store complex state that persists between frames
- **Physics Simulation**: Calculate physics that would be difficult in GLSL
- **Custom Audio Analysis**: Create derivative audio metrics tailored to your visualization
- **Sequencing**: Create timed sequences of effects and animations
- **Communication**: Controllers can be used to communicate between different components
- **Network Effects**: Fetch data from external sources and incorporate it into visualizations
