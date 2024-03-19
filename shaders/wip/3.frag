
void mainImage( out vec4 c, vec2 p ) {

    // set position
    vec2 v = iResolution.xy;
    p = (p-v*.5)*.4 / v.y;
    // breathing effect
    p += p * sin(dot(p, p)*20.-energyZScore) * .04;

    // accumulate color
    c *= 0.;
    for (float i = .5 ; i < 5. ; i++)

        // fractal formula and rotation
        p = abs(2.*fract(p-.5)-1.) * mat2(cos(.01*(spectralCentroidZScore)*i*i + .78*vec4(1,7,3,1))),

        // coloration
        c += exp(-abs(p.y)*5.) * (cos(vec4(2,3,1,0)*i)*.5+.5);



    // palette
    c.gb *= .5;

}
