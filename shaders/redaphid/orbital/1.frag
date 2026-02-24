uniform float knob_14;
#define PROBE_A mix(-2.,-1.14,energyZScore)
#define PROBE_B knob_14
#define rot(a) mat2(cos(a + vec4(0,33,11,0)))
#define CS(a)  cos(a + vec2(0,11) )
#define D(r)   abs( sin(2.*length(p + r* CS( radians(360./7.) * i ) ) - cos(t*2.)/2.) )

void mainImage( out vec4 O, vec2 u )
{
    vec2 R = iResolution.xy, 
         p =  ( u -.5* R ) / R.y
            * rot( 6.28*sin(PROBE_A*.2) );
    O *= 0.;

    float d1, d2, s,
          r1 = .14*sin(PROBE_A*.5),
          r2 = r1 + 1. + sin(PROBE_A*.5),
          t = .495;

    for (float i; i<7.; i++ )
    {     
        d1 = D(r1);
        d2 = D(r2);      
        s = smoothstep( d2-.01, .04, d2);

        O += .0015/d1 + .0025/d2;
        O[ int(s/.4) ] += s*.5;
    }
}