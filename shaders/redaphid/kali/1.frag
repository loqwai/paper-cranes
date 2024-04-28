
uniform float knob_22;
uniform float knob_11;
uniform float knob_21;
uniform float knob_10;
uniform float knob_20;
uniform float knob_9;
uniform float knob_19;
#define EPSILON 0.0001

#define PROBE_A spectralCentroid + EPSILON
#define PROBE_B mix(0.3,0.46,spectralKurtosis) + EPSILON
#define PROBE_C  mix(-0.37,0.8,energy) + EPSILON /*knob_21 + EPSILON*/
#define PROBE_D spectralCrest + EPSILON
#define PROBE_E bass + EPSILON
#define PROBE_F mix(0.06,0.25,spectralRoughness)
#define PROBE_G knob_19 + EPSILON


#define max_iter 31
#define num_iter int(mix(10.,40.,PROBE_F))
vec3 kali_av(in vec3 p);
vec3 kali_orbit(in vec3 p);

// main function
// plug-in any pos->color function here
vec3 fractal_color(in vec2 p)
{
    vec3 p3 = vec3(p, 0.);
    vec3 av =  kali_av(p3);
    vec3 orbit = kali_orbit(p3);
    return mix(av, orbit, PROBE_D);
}

// magic parameter
vec3 kali_param;

// returns average value from kaliset
vec3 kali_av(in vec3 p)
{
    vec3 col = vec3(0.);
    for (int i=0; i<max_iter; ++i)
    {
        if (i >= num_iter) break;
        p = abs(p) / dot(p, p);
        col += exp(-p*20.);
        p -= kali_param;
    }
    col /= float(num_iter);
    col *= 4.;

    col = pow(clamp(col, 0., 1.), vec3(2.));

    return col;
}

// returns minimum distance to x,y,z lines in kaliset
vec3 kali_orbit(in vec3 p)
{
    vec3 d = vec3(1.);
    for (int i=0; i<max_iter; ++i)
    {

        if (i >= num_iter) break;

        p = abs(p) / dot(p, p);
        d = min(d, p);
        //d = min(d, abs(p-.25));
        d = min(d, abs(p-.5));
        //d = min(d, abs(p-.75));
        //d = min(d, length(p-.5));
        p -= kali_param;
    }
    return pow(max(vec3(0.), 1.-3.*d), vec3(13.));
}

vec4 param_preset()
{
    return vec4(PROBE_A,PROBE_B,PROBE_C,31);
}

// used for AA
vec2 hash2(in vec2 v) { return fract(sin(v*vec2(13.,17.))*(73349.2-v.x+v.y)); }


#define READ(idx_) vec4(0.)
#define S_POS 0
#define S_ZOOM 1
#define S_MOUSE 2
#define S_DRAG_START 3
#define S_ACTION 4
#define S_PRESET 5
#define S_KALI_PARAM 6 // 6-15
#define PARAM_SCALE vec4(1.5,1.5,1.5,max_iter)

#define A_DRAG 1
#define A_PRESET 2
#define A_SLIDER 3 // 3,4,5,6

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // previous states

    fragColor = texture(iChannel0, fragCoord / iResolution.xy, -100.);
    vec2  pos =    vec2(PROBE_G);
    vec2  ppos =   READ(S_DRAG_START).xy;
    float zoom =   READ(S_ZOOM).x;
    vec4  mouse =  READ(S_MOUSE);
	vec4  param =  READ(S_KALI_PARAM);
    int   curAct = int(READ(S_ACTION).x);

    bool doReset = false;

    // reset
	if (iFrame == 0)
    {
    	fragColor = vec4(0.);

        pos = vec2(0.);
        zoom = PROBE_E;
        curAct = 0;

        param = param_preset();
	}

    // change & store state
    if (fragCoord.y < 1.)
    {

            vec2 m = iMouse.xy / iResolution.xy;

            // mouse start click?
            if (mouse.z < .5)
            {
                // parameter sliders
                if (m.x > .5 && m.y < .1)
                {
                    float idx = floor(m.y*30.);
                    if (idx >= 3.)
                    	curAct = A_SLIDER+3;
                    else if (idx >= 2.)
                    	curAct = A_SLIDER+2;
                	else if (idx >= 1.)
                    	curAct = A_SLIDER+1;
	                else
                    	curAct = A_SLIDER;
                }
                // preset
                else if (m.x < .5 && m.y < .1)
                {
                    param = READ(S_KALI_PARAM);
                    curAct = A_PRESET;
                }
            }

            // drag sliders
			if (curAct >= A_SLIDER)
    		{
                m = (m-vec2(.5,.0))/vec2(.5,.1);
                if (curAct == A_SLIDER)
                    param.x = m.x * PARAM_SCALE.x;
                else if (curAct == A_SLIDER+1)
                    param.y = m.x * PARAM_SCALE.y;
                else if (curAct == A_SLIDER+2)
                    param.z = m.x * PARAM_SCALE.z;
                else
                    param.w = m.x * PARAM_SCALE.w;
            }
            else if (curAct == 0 || curAct == A_DRAG)
            {
                // start drag
                if (mouse.z < .5)
                {
                    curAct = A_DRAG;
                }
                // continue drag
                else
                {
                    vec2 delta = (iMouse.xy - mouse.xy) / iResolution.y;
                    pos -= delta / zoom * 2.;
                }
            }
    }
    // render
    else if (fragColor.w < 200. || doReset)
    {					 // ^ max AA samples

        vec2 fc = fragCoord + hash2(fragCoord + iMouse.xy);
    	vec2 uv = (fc - iResolution.xy*.5) / iResolution.y * 2.;

        vec2 p = uv / zoom + pos;

        kali_param = param.xyz;
    	vec3 col = fractal_color(p);
        fragColor += vec4(col, 1.);
    }
}
