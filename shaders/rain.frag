
#define S(a,b,t)smoothstep(a,b,t)


vec3 generatePlasma(vec2 uv, float time) {
    // High-frequency noise for detailed plasma balls
    vec2 noise = vec2(
        sin(dot(uv, vec2(spectralKurtosisStandardDeviation, spectralKurtosisMedian))) * spectralFluxMedian,
        sin(dot(uv, vec2(11.1375, 17.857))) * spectralRoughnessMedian
    );

    // Combine multiple noise frequencies for variation
    float plasma = sin(uv.x * cos(time * 0.2) * 10.0 + noise.x) +
                   cos(uv.y * cos(time * 0.15) * 10.0 + noise.y);
    plasma += sin(length(uv + vec2(sin(time * 0.1), cos(time * 0.2))) * 10.0 + noise.y);
    plasma *= 0.5;

    // Color modulation with HSL clamping for rain-like colors
    vec3 col = rgb2hsl(0.5 + 0.5 * cos(time + plasma * vec3(0.5, 0.4, 0.3)));
    col.x = clamp(col.x, 0.5, 0.75); // Constrain hue to a rain-like range
    // col.y = clamp(col.y, 0.3, 0.8); // Adjust saturation as desired
    // col.z = clamp(col.z, 0.3, 0.5); // Adjust lightness as desired
    col = hsl2rgb(col);

    return col;
}


vec3 N13(float p){
    //  from DAVE HOSKINS
    vec3 p3=fract(vec3(p)*vec3(.1031,.11369,.13787));
    p3+=dot(p3,p3.yzx+19.19);
    return fract(vec3((p3.x+p3.y)*p3.z,(p3.x+p3.z)*p3.y,(p3.y+p3.z)*p3.x));
}

vec4 N14(float t){
    return fract(sin(t*vec4(123.,1024.,1456.,264.))*vec4(6547.,345.,8799.,1564.));
}
float N(float t){
    return fract(sin(t*12345.564)*7658.76);
}

float Saw(float b,float t){
    return S(0.,b,t)*S(1.,b,t);
}

vec2 DropLayer2(vec2 uv,float t){
    vec2 UV=uv;

    uv.y+=t*.75;
    vec2 a=vec2(6.,1.);
    vec2 grid=a*2.;
    vec2 id=floor(uv*grid);

    float colShift=N(id.x);
    uv.y+=colShift;

    id=floor(uv*grid);
    vec3 n=N13(id.x*35.2+id.y*2376.1);
    vec2 st=fract(uv*grid)-vec2(.5,0);

    float x=n.x-.5;

    float y=UV.y*20.;
    float wiggle=sin(y+sin(y));
    x+=wiggle*(.5-abs(x))*(n.z-.5);
    x*=.7;
    float ti=fract(t+n.z);
    y=(Saw(.85,ti)-.5)*.9+.5;
    vec2 p=vec2(x,y);

    float d=length((st-p)*a.yx);

    float mainDrop=S(.4,.0,d);

    float r=sqrt(S(1.,y,st.y));
    float cd=abs(st.x-x);
    float trail=S(.23*r,.15*r*r,cd);
    float trailFront=S(-.02,.02,st.y-y);
    trail*=trailFront*r*r;

    y=UV.y;
    float trail2=S(.2*r,.0,cd);
    float droplets=max(0.,(sin(y*(1.-y)*120.)-st.y))*trail2*trailFront*n.z;
    y=fract(y*10.)+(st.y-.5);
    float dd=length(st-vec2(x,y));
    droplets=S(.3,0.,dd);
    float m=mainDrop+droplets*r*trailFront;

    //m += st.x>a.y*.45 || st.y>a.x*.165 ? 1.2 : 0.;
    return vec2(m,trail);
}

float StaticDrops(vec2 uv,float t){
    uv*=spectralFluxMedian;

    vec2 id=floor(uv);
    uv=fract(uv)-.5;
    vec3 n=N13(id.x*107.45+id.y*3543.654);
    vec2 p=(n.xy-.5)*.7;
    float d=length(uv-p);

    float fade=Saw(.025,fract(t+n.z));
    float c=S(.3,0.,d)*fract(n.z*10.)*fade;
    return c;
}

vec2 Drops(vec2 uv,float t,float l0,float l1,float l2){
    float s=StaticDrops(uv,t)*l0;
    vec2 m1=DropLayer2(uv,t)*l1;
    vec2 m2=DropLayer2(uv*1.85,t)*l2;

    float c=s+m1.x+m2.x;
    c=S(.3,1.,c);

    return vec2(c,max(m1.y*l0,m2.y*l1));
}

void mainImage(out vec4 fragColor,in vec2 fragCoord)
{
    float scaledTime = time + 100.;
    vec2 uv=(fragCoord.xy-.5*resolution.xy)/resolution.y;
    uv.x += cos((scaledTime*spectralCentroidMedian)/1000.)/1000.;
    uv.y += atan((scaledTime*energyMedian)/1000.)/1000.;
    // uv = sin(uv);
    vec2 UV=fragCoord.xy/resolution.xy;
    float T=scaledTime*2.;

    float t=T*.2;
    vec3 plasma = generatePlasma(uv, scaledTime);
    float rainAmount=sin(T*.05)*.3+spectralFluxMedian*(6.+energyZScore);

    float maxBlur=mix(3.,6.,rainAmount);
    float minBlur=1.-spectralRolloffZScore*3.;

    float zoom=-.7 * (sin((scaledTime+energyMedian)/100.)*10.)-0.5;
    uv*=.7+zoom*.3;

    UV=(UV-.5)*(.9+zoom*.1)+.5;

    float staticDrops=S(spectralCentroidZScore*3.,1.,rainAmount)*2.;
    float layer1=S(.25,.75,rainAmount);
    float layer2=S(.0,.5,rainAmount);

    vec2 c=Drops(uv,t,staticDrops,layer1,layer2);

    vec2 e=vec2(.001,0.);
    float cx=Drops(uv+e,t,staticDrops,layer1,layer2).x;
    float cy=Drops(uv+e.yx,t,staticDrops,layer1,layer2).x;
    vec2 n=vec2(cx-c.x,cy-c.x);// expensive normals

    float focus=mix(maxBlur-c.y,minBlur,S(.1,.2,c.x));
    vec3 col=textureLod(prevFrame,UV+n,focus).rgb;
    col = hslmix(col, vec3(c,1.), 0.1); // Add rain effect

    float presenceOfRain = cx; // Rain intensity from Drops function

    // Darken areas not occupied by rain more than those that are
    float darkeningFactor = mix(1.0, 0.98, 1.0 - (presenceOfRain/10.)); // Adjust the 0.98 to control darkening
    plasma *= darkeningFactor;
    col = hslmix(col, plasma, (energyZScore+1.)/80.); // Add plasma effect
    col = rgb2hsl(col);
    col.y = clamp(col.y, 0.2, 0.8);
    col.z = clamp(col.z, 0.2 ,0.4);
    col = hsl2rgb(col);

    fragColor=vec4(col,1.);
}
// #pragma glslify:import(./includes/shadertoy-compat-main)
