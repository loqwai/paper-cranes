float bailout = 8.0;
float power = 8.0;
int maxRaySteps =  60;
float minimumStepDistance = 0.001;
int maxIters = 8;
float eps = 0.00001;
float zoom = 2.0;

vec3 camera = vec3(.0,2.0,-2.0);
vec3 focus = vec3(0.0,0.0,0.0);
vec3 light = vec3(0.0,0.0,5.0);

float atan3(in float y, in float x) {
    return x == 0.0 ? sign(y)*(spectralSpreadMean) : atan(y, x);
}

vec3 toRectangular(in vec3 sph) {
    return vec3(sph.x*sin(sph.z)*cos(sph.y),
             	sph.x*sin(sph.z)*sin(sph.y),
			 	sph.x*cos(sph.z));
}

vec3 toSpherical(in vec3 rec) {
	return vec3(length(rec),
             	atan3(rec.y,rec.x),
            	atan3(sqrt(rec.x*rec.x+rec.y*rec.y),rec.z));
}

float escape(in vec3 position) {
    int iterations = int(spectralRoughnessMean/10.0);
	vec3 z = position;
    float r = 0.0;
    float theta,phi,zr;
    int i=0;
    for(i=0;i<iterations;i++) {
    	r = length(z);
        if(r>bailout) break;

        theta = power*atan3(sqrt(z.x*z.x+z.y*z.y),z.z);
        phi = power*atan3(z.y,z.x);
        zr = pow(r,power);
		z = vec3( zr*sin(theta)*cos(phi) + position.x,
                  zr*sin(phi)*sin(theta) + position.y,
                  zr*cos(theta) + position.z		 );
    }
    //return float(i) + log(log(r*r))/log(2.0) - log(log(dot(z,z)))/log(2.0);
    return float(i);

}

float DE(in vec3 position) {
	vec3 z = position;
    float dr = 1.0;
    float r = 0.0;
    float theta,phi,zr;
    int iterations = int(spectralRoughnessMean/10.0);
    for(int i=0;i<iterations;i++) {
    	r = length(z);
        if(r>bailout) break;

        theta = power*atan3(sqrt(z.x*z.x+z.y*z.y),z.z);
        phi = power*atan3(z.y,z.x);
        zr = pow(r,power);
		z = vec3( zr*sin(theta)*cos(phi) + position.x,
                  zr*sin(phi)*sin(theta) + position.y,
                  zr*cos(theta) + position.z		 );
    	dr = ( pow(r, power-1.0)*power*dr ) + 1.0;
    }
    return 0.5*log(r)*r/dr;
}

vec3 normalOf(in vec3 pos) {
	return normalize(vec3(DE(pos + vec3(eps,0,0))-DE(pos-vec3(eps,0,0)),
		                DE(pos+vec3(0,eps,0))-DE(pos-vec3(0,eps,0)),
		                DE(pos+vec3(0,0,eps))-DE(pos-vec3(0,0,eps))));
}

float phong(in vec3 position) {
	vec3 k = (position - light) + (camera - light);
    vec3 h = k/length(k);
    return dot(h,normalOf(position));

}

vec3 march(in vec3 from, in vec3 direction) {
	float totalDistance = 0.0;
    float dist;
    vec3 position;
    int steps;
    for (steps=0;steps<maxRaySteps;steps++) {
        position = vec3(from.x + (direction.x*totalDistance),
                        from.y + (direction.y*totalDistance),
                        from.z + (direction.z*totalDistance));
        dist=DE(position);
        totalDistance+=dist;
        if(totalDistance>25.0) return vec3(0,0,0);
        if(dist<minimumStepDistance) break;
	}
    return vec3(0.5+sin(escape(position)),
        		0.6,
        		0.7*(1.0-float(steps)/float(maxRaySteps)) + 0.3*phong(position) );
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    power = 6.0-4.0*cos(spectralRoughnessMean/1000.0) ;
    /*camera = vec3(2.0*cos(iTime*0.05),
                  2.0*sin(iTime*0.05),
                  -2.0);*/
    vec3 viewVector = vec3(focus.x-camera.x,focus.y-camera.y,focus.z-camera.z);
    vec3 topVector = toSpherical(viewVector);
    topVector.z += 1.5708;
    topVector = toRectangular(topVector);
    vec3 sideVector = cross(viewVector,topVector);
    sideVector = normalize(sideVector)*length(topVector);

    //zoom=1.0-(iTime/50.0);
    //maxRaySteps = 10+2*int(iTime);
    //minimumStepDistance = ;
    float dx = zoom*(fragCoord.x/iResolution.x - 0.5);
    float dy = zoom*(fragCoord.y/iResolution.y - 0.5)*(iResolution.y/iResolution.x);

    vec3 direction = (sideVector*dx) + (topVector*dy) + viewVector;

    direction = normalize(direction);
    vec3 hsl = march(camera,direction)	;
    hsl.x = fract(hsl.x + spectralCentroidMean);
	fragColor = vec4(hsl2rgb(hsl),1.0);

}
