#version 300 es
precision highp float;

out vec4 fragColor;

uniform float time;
uniform vec2 resolution;// iResolution equivalent

uniform int frame;

#pragma glslify: import(./previous-frame.frag)
