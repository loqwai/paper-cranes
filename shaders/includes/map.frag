#pragma glslify: export(map)
float map(float val, float inMin, float inMax, float outMin, float outMax) {
    return outMin + (outMax - outMin) * (val - inMin) / (inMax - inMin);
}
