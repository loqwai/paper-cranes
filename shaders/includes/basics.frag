out vec4 fragColor;

uniform float time;
uniform vec2 resolution;// iResolution equivalent
uniform sampler2D prevFrame;// Texture of the previous frame

uniform int frame;

vec4 getLastFrameColor(vec2 uv){
  return texture(prevFrame,uv);
}
