    #version 300 es
    precision mediump float;

    uniform float iTime; // Uniform time variable, for animation effects
    uniform int gridSize;
    void main() {
        int gridWidth = gridSize; // Assume a 100x100 grid
        float x = float((gl_VertexID % gridWidth) - 50) / 50.0; // Normalize X between -1 and 1
        float y = float((gl_VertexID / gridWidth) - 50) / 50.0; // Normalize Y between -1 and 1
        float z = sin(iTime + length(vec2(x, y)) * 10.0) * 0.1; // Z position based on a wave pattern

        gl_Position = vec4(x, y, z, 1.0); // Output position directly to clip space
    }
