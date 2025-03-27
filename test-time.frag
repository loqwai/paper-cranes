void mainImage(out vec4 fragColor, in vec2 fragCoord) { setTime(0.0); vec2 uv = fragCoord/iResolution.xy; fragColor = vec4(uv.x, uv.y, 0.0, 1.0); }
