#define max_iter 31
#define num_iter 31
vec3 kali_av(in vec3 p);
vec3 kali_orbit(in vec3 p);

// main function
// plug-in any pos->color function here
vec3 fractal_color(in vec2 p)
{
    vec3 p3 = vec3(p, 0.);
    return kali_av(p3);
    //return kali_orbit(p3);
}


// #ifndef FREE_ITER
// // number of iterations in the kaliset
// const int max_iter = 31;
// #else
// // number of maximum iters
// const int max_iter = 99;
// // number of actual iters
// 	  int num_iter = 31;
// #endif

// magic parameter
vec3 kali_param;

// returns average value from kaliset
vec3 kali_av(in vec3 p)
{
    vec3 col = vec3(0.);
    for (int i=0; i<max_iter; ++i)
    {
#ifdef FREE_ITER
        if (i >= num_iter) break;
#endif        
        p = abs(p) / dot(p, p);
        col += exp(-p*20.);
        p -= kali_param;
    }
    col /= float(num_iter);
    col *= 4.;
    
    //col = pow(clamp(col, 0., 1.), vec3(2.));
    
    return col;
}

// returns minimum distance to x,y,z lines in kaliset
vec3 kali_orbit(in vec3 p)
{
    vec3 d = vec3(1.);
    for (int i=0; i<max_iter; ++i)
    {
#ifdef FREE_ITER
        if (i >= num_iter) break;
#endif        
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

vec4 param_preset(in int idx)
{
    vec3 p;
    	 if (idx == 0) p = vec3(1., 1., 1.01);        
    else if (idx == 1) p = vec3(1.);
	else if (idx == 2) p = vec3(0.39, 1.30, 0.4);
	else if (idx == 3) p = vec3(0.075, 0.565, .03);
	else if (idx == 4) p = vec3(.835, .835, .96);
    else if (idx == 5) p = vec3(.5, .4, 1.578);
	else if (idx == 6) p = vec3(.4, .5, .8);
	else if (idx == 7) p = vec3(1., 1., .13);
	else if (idx == 8) p = vec3(0.11, 0.09, 1.33);
	else 			   p = vec3(0.45, 0.97, 1.578);
    return vec4(p, 31);
}

// used for AA
vec2 hash2(in vec2 v) { return fract(sin(v*vec2(13.,17.))*(73349.2-v.x+v.y)); }

#define STORE(idx_, val_) { if (int(fragCoord.x) == int(idx_)) fragColor = vec4(val_); }
#define READ(idx_) texture(iChannel0, vec2(float(idx_)+.5,.5)/iResolution.xy, -100.)
#define ISKEY(idx_) (texture(iChannel1, vec2(float(idx_)+.5,.5)/256., -100.).x > .5)

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
    vec2  pos =    READ(S_POS).xy;
    vec2  ppos =   READ(S_DRAG_START).xy;
    float zoom =   READ(S_ZOOM).x; 
    vec4  mouse =  READ(S_MOUSE);
    int   curPreset = int(READ(S_PRESET));
	vec4  param =  READ(S_KALI_PARAM+curPreset);
    int   curAct = int(READ(S_ACTION).x);
    
    bool doReset = false;
    
    // reset
	if (iFrame == 0 || ISKEY(82))
    {
    	fragColor = vec4(0.);
        for (int i=0; i<10; ++i)
			STORE(S_KALI_PARAM+i, param_preset(i));

        pos = vec2(0.);
        zoom = 1.;
        curAct = 0;

        param = param_preset(curPreset);
        doReset = true;
	}
		
    
    // zoom & determine if we need to reset the color accum.
    if (ISKEY(81))
        zoom *= .97, doReset = true;
    if (ISKEY(87))
        zoom *= 1.03, doReset = true;
    if (iMouse.z > .5)
        doReset = true;
    
    // change & store state
    if (fragCoord.y < 1.)
    {
        // mouse release
        if (iMouse.z < .5)
        {
            curAct = 0;
        }
        else // mouse down
        {
            vec2 m = iMouse.xy / iResolution.xy;
            
            // mouse start click?
            if (mouse.z < .5)
            {
                // parameter sliders
                if (m.x > .5 && m.y < .1)
                {
#ifndef FREE_ITER                    
                    float idx = floor(m.y*30.);
#else
                    float idx = floor(m.y*40.);
#endif                    
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
                    curPreset = int(m.x*20.);
                    param = READ(S_KALI_PARAM+curPreset);
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
                    STORE(S_DRAG_START, vec4(pos, 0,0));
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
        STORE(S_POS, vec4(pos,0,0));
        STORE(S_ZOOM, zoom);
        STORE(S_MOUSE, iMouse);
        STORE(S_KALI_PARAM+curPreset, max(param, vec4(-1.,-1.,-1.,1.)));
        STORE(S_ACTION, float(curAct));
        STORE(S_PRESET, float(curPreset));
    }
    // render
    else if (fragColor.w < 100. || doReset)
    {					 // ^ max AA samples
        
        vec2 fc = fragCoord + hash2(fragCoord + iMouse.xy);
    	vec2 uv = (fc - iResolution.xy*.5) / iResolution.y * 2.;
    
        vec2 p = uv / zoom + pos;
        
        kali_param = param.xyz;
#ifdef FREE_ITER
        num_iter = int(param.w);
#endif        
    	vec3 col = fractal_color(p);

        // accum color
        if (!doReset)
    		fragColor += vec4(col, 1.);
        // reset color
        else
            fragColor = vec4(col, 1.);
    }
}