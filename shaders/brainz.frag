//http://localhost:6969/?shader=wip/brainz&history-size=50

#define MAXDIST 20.
#define GIFLENGTH 3.570795
#define A pow(energyZScore+1.,(beat?4.:2.))
#define C (spectralRoughnessZScore/10. + 0.5)
#define D spectralCentroid/5.
struct Ray {
	vec3 ro;
    vec3 rd;
};

void pR(inout vec2 p, float a) {
	p = cos(a)*p + sin(a)*vec2(p.y, -p.x);
}

float length6( vec3 p )
{
	p = p*p*p; p = p*p;
	return pow( p.x + p.y + p.z, 1.0/6.0 );
}

float fractal(vec3 p)
{
   	float len = length(p);
    p=p.yxz;

    float scale = 1.25;
    const int iterations = 28;
    float a = A;
	float l = 0.;

    vec2 rotationAnimAmp = vec2(0.05,0.04);
	vec2 rotationPhase = vec2(.45 + sin(A*4. + len*0.4) * 0.025,0.15 + cos(-0.2+A*4. + len*0.2) * 0.05);

    vec3 juliaOffset = vec3(-3.,-1.15,-.5)*C;

    pR(p.xy,.5+sin(-0.25+A*4.)*0.1);

    for (int i=0; i<iterations; i++) {
		p = abs(p);
        // scale and offset the position
		p = p*scale + juliaOffset;

        // Rotate the position
        pR(p.xz,rotationPhase.x*3.14 + cos(A*4. + len)*rotationAnimAmp.y);
		pR(p.yz,rotationPhase.y*3.14 + sin(A*4. + len)*rotationAnimAmp.x);
        l=length6(p);
	}
	return l*pow(scale, -float(iterations))-.25;
}

vec2 map(vec3 pos) {
    float l = length(pos);

    float dist = fractal(pos);

    return vec2(dist, 0.);
}

vec2 march(Ray ray)
{
    const int steps = 30;
    const float prec = 0.001;
    vec2 res = vec2(0.);

    for (int i = 0; i < steps; i++)
    {
        vec2 s = map(ray.ro + ray.rd * res.x);

        if (res.x > MAXDIST || s.x < prec)
        {
        	break;
        }

        res.x += s.x;
        res.y = s.y;

    }

    return res;
}

vec3 calcNormal(vec3 pos)
{
	const vec3 eps = vec3(0.005, 0.0, 0.0);

    return normalize(
        vec3(map(pos + eps).x - map(pos - eps).x,
             map(pos + eps.yxz).x - map(pos - eps.yxz).x,
             map(pos + eps.yzx).x - map(pos - eps.yzx).x )
    );
}

float calcAO( in vec3 pos, in vec3 nor )
{
float occ = 0.0;
    float sca = 1.0;
    for( int i=0; i<5; i++ )
    {
        float hr = 0.2*float(i)/4.0;
        vec3 aopos =  nor * hr + pos;
        float dd = map( aopos ).x;
        occ += -(dd-hr)*sca;
        sca *= .95;
    }
    return clamp( 1.0 - 2.0*occ, 0.0, 1.0 );
}
vec4 render(Ray ray)
{
    vec3 col = vec3(0.);
	vec2 res = march(ray);

    if (res.x > MAXDIST)
    {
        return vec4(col, MAXDIST);
    }

    vec3 p = ray.ro+res.x*ray.rd;
    vec3 normal = calcNormal(p);
    vec3 pos = p;
    ray.ro = pos;
    // color with ambient occlusion
   	col = vec3(pow(calcAO(p, normal), 3.2))*0.5;

    col = mix(col, vec3(0.), clamp(res.x/MAXDIST, 0., 1.));
   	return vec4(col, res.x);
}
mat3 camera(in vec3 ro, in vec3 rd, float rot)
{
	vec3 forward = normalize(rd - ro);
    vec3 worldUp = vec3(sin(rot), cos(rot), 0.0);
    vec3 x = normalize(cross(forward, worldUp));
    vec3 y = normalize(cross(x, forward));
    return mat3(x, y, forward);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
	vec2 uv = fragCoord.xy / iResolution.xy;
    uv = uv * 2.0 - 1.0;
    uv.x *= iResolution.x / iResolution.y;

    vec3 camPos = vec3(6.,4.5, 6.);
    vec3 camDir = camPos + vec3(-.85, -.6, -1. );
    mat3 cam = camera(camPos, camDir, 0.);

    vec3 rayDir = cam * normalize( vec3(uv, 1. + sin(A*4.)*0.05) );

    Ray ray;
    ray.ro = camPos;
    ray.rd = rayDir;

    vec4 col = render(ray);
    col.xyz = pow(col.xyz, vec3(0.6));

	col = vec4(col.xyz,clamp(1.-col.w/MAXDIST, 0., 1.));
    vec3 hsl = rgb2hsl(col.xyz);
    hsl.x = fract(hsl.x+D);
    if(hsl.z < 0.01){
        fragColor = vec4(0.);
        return;
    }
    if (hsl.z < 0.1) {
        hsl.x += fract(hsl.x+0.7);
        hsl.y += .5;
        hsl.z +=0.5;
        fragColor = vec4(hsl2rgb(hsl), 1.0);
        return;
    }
    if (hsl.z < 0.3) {
        hsl.x += fract(hsl.x-0.3);
        hsl.y += .5;
        hsl.z -=0.1;
        fragColor = vec4(hsl2rgb(hsl), 1.0);
        return;
    }
    if (hsl.z < 0.7) {
        hsl.x += fract(hsl.x-0.6);
        hsl.y += .5;
        hsl.z -=0.1;
        fragColor = vec4(hsl2rgb(hsl), 1.0);
        return;
    }
    // hsl.y = 0.5;
    fragColor = vec4(hsl2rgb(hsl), 1.0);
}
