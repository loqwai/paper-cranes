// Fork of "Moire 3d template" by ChunderFPV. https://shadertoy.com/view/lc3SWN

#define A(a) mat2(cos(a*6.2832+vec4(0, -1.5708, 1.5708, 0)))  // rotate
#define O(x,a,b) ((cos(x*6.2832)*.5+.5)*(a-b)+b)  // oscillate x between a & b
#define H(v) O(radians(vec3(0, 60, 120))+(v), 1., 0.)  // hue

// hex grid ( from FabriceNeyret2 )
vec2 hg(vec2 u)
{
    vec2 o = vec2(.5, .866),
         a = mod(u,   o+o)-o,
         b = mod(u-o, o+o)-o;
    return dot(a,a) < dot(b,b) ? a : b;
}

void mainImage( out vec4 C, in vec2 U )
{
    float t = mod(iTime/60., 10.), // 60 sec between ints, repeat after 10
          d = 0., i = d, s, r, n, nt;

    vec2 R = iResolution.xy,
         m = (iMouse.xy-.5*R)/R.y; // mouse coords

    if (iMouse.z < 1.) m = vec2(t, -.35); // not clicking

    vec3 o = vec3(0, 0, -O(t/2., 80., 110.)), // camera
         u = normalize(vec3(U-R/2., R.y*.7)), // coords
         c = vec3(0), p, q;

    mat2 rh = A(m.x), // rotate horizontal
         rv = A(m.y); // rotate vertical

    for (; i++<1e2;) // raymarch loop
    {
        p = o+u*d;
        p.xz *= rh;
        p.yz *= rv;
        //p.xy *= A(.5/p.z); // twist
        r = length(p); // radius
        p *= sqrt(abs(1. - r*r/1e3)); // coord transform
        q.xy = p.xy - hg(p.xy/2.)*2.; // xy to hex
        n = length(q); // pattern
        nt = n*t; // multiply with time
        p.z = abs(p.z) - 1. - sin(nt*6.2832) * (1. + bassNormalized*0.6); // move z + bass swell
        s = length(p-q*vec3(1,1,0)) - min(.3, n/1e2) * (-sign(35.-r)*.5+.5); // spheres

        d += sqrt(s)*.35;
        c += min(s, .004*sqrt(d/s)) * H(nt) * O(nt, 1., .3) * min(1., 2e2/n); // color & stuff
        if (s < 1e-3 || d > 1e3) break;
    }

    C = vec4(tanh(c*c*c), 1);
}
