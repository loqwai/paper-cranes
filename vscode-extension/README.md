# Paper Cranes Shader Syntax

Language support for [Paper Cranes](https://github.com/loqwai/paper-cranes) audio visualization shaders.

## Features

- Syntax highlighting for GLSL shader files (`.frag`, `.vert`, `.glsl`)
- Intelligent code completion for Paper Cranes-specific uniforms and functions including:
    - Audio analysis uniforms (`spectralCentroid`, `energy`, `spectralRolloff`, etc.)
    - Helper functions (`getLastFrameColor`, `mapValue`)
    - Constants (`PI`, `resolution`, `time`)
- Smart bracket matching and auto-closing pairs
- Comment toggling support (line and block comments)

## Installation

`code --install-extension paper-cranes-shader-syntax-1.0.0.vsix`

Or install directly from the VS Code marketplace by searching for "Paper Cranes Shader Syntax".

## Development

1. Clone the repository
2. Install dependencies:
    ```bash
    npm install
    ```
3. Build the extension:
    ```bash
    npm run build
    ```

## Usage with Paper Cranes

This extension is designed to work with the [Paper Cranes](https://github.com/loqwai/paper-cranes) audio visualization project. It provides enhanced editing support when working with Paper Cranes shader files.

## License

MIT License - see LICENSE file for details.
