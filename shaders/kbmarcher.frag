// MAKE SURE TO NAME PUT YOUR SHADER IN "shaders/<YOUR_GITHUB_USERNAME>"
// and make sure the filename ends in .frag
// for example, if your username is "hypnodroid", and you want to publish "my-shader.frag", the filename should be "hypnodroid/my-shader.frag"



#define SS(a,b,c) smoothstep(a-b,a+b,c)
#define gyr(p) dot(sin(p.xyz),cos(p.zxy))
#define T iTime
#define R iResolution
float map(in vec3 p) {
    return (1. + .2*sin(p.y*spectralFlux)) *
    gyr(( p*(spectralCentroid*10.) + .8*gyr(( p*8. )) )) *
    (1.+sin(T+length(p.xy)*10.)) +
    .3 * sin(T*.15 + p.z * 5. + p.y) *
    (2.+gyr(( p*(sin(T*.2+p.z*3.)*350.+250.) )));
}
vec3 norm(in vec3 p) {
    float m = map(p);
    vec2 d = vec2(energyZScore * 0.06+spectralFluxNormalized*sin(p.z),0.);
    return map(p)-vec3(
        map(p-d.xyy),map(p-d.yxy),map(p-d.yyx)
    );
}
void mainImage( out vec4 color, in vec2 coord ) {
    vec2 uv = coord/R.xy;
    vec2 uvc = (coord-R.xy/2.)/R.y;
    float d = 0.;
    float dd = 1.;
    vec3 p = vec3(0.,0.,T/94.);
    vec3 rd = normalize(vec3(uvc.xy,1.));
    for (float i=0.;i<90. && dd>.001 && d < spectralCentroidMedian * 4.;i++) {
        d += dd;
        p += rd*d;
        dd = map(p)*.02;
    }
    vec3 n = norm(p);
    float bw = n.x+n.y;
    bw *= SS(spectralCentroidMedian,spectralEntropyMedian,1./d);
    vec3 final = hsl2rgb(vec3(bw));
    final.x += spectralCentroidNormalized/4.;
    final.y += spectralRolloffNormalized/4.;
    final.z += bw;
    final = mix(hsl2rgb(sin(final)), (getLastFrameColor(uv).rgb), 0.9);
    color = vec4(final,1.);
}
