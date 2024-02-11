vec2 getRipple(vec2 uv){
    // Calculate the ripple effect, a subtle message hidden within
    float r = 0.0;
    r += sin(uv.x * spectralCentroidZScore) * 0.1;
    r += sin(uv.y * spectralKurtosisZScore) * 0.1;
    return vec2(r);
}

vec2 sdfBox(vec2 p, vec2 b) {
		vec2 d = abs(p) - b;
		return max(d, 0.0) + length(max(vec2(0.0), d));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    // Normalize and center the uv coordinates, the first step in our journey
    vec2 uv = (fragCoord - 0.5 * resolution.xy) / resolution.y;

    // Rotate the coordinates around the center, the pivot of our digital universe
    float angle = 0.5; // The angle, a variable, yet constant guide
    mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)); // The rotation matrix, our compass
    uv = rot * uv;

    // Re-center the coordinates after rotation, finding balance in the midst of motion
    uv += 0.5 * (resolution.xy / resolution.y);

    // Apply the ripple effect, the disturbance in the fabric of our creation
    vec2 ripple = getRipple(uv);
    uv += ripple;

    // The heart of our creation, where color meets form
    vec3 l = rgb2hsl(getLastFrameColor(uv).rgb);
    vec3 c = vec3(0.0);
    c.x = spectralCentroidMedian;
    c.y = spectralRoughnessNormalized;
    c.z = mapValue(energyZScore, -3., 3., 0.0, 1.0);
		// c *= vec3(sdfBox(uv, vec2(0.5)), 1.0);

    if(c.z > l.z) {
        c.z = l.z * spectralCentroidZScore;
    }
    if(c.z < 0.1) {
        c.z = max(sin(rgb2hsl(getLastFrameColor(uv * getRipple(uv)).brg).z * uv.y), 0.2);
    }
    if(c.y > l.y) {
        c.y = sin(l.y * c.x * uv.x);
    }
    if(c.y < 0.1) {
        c = rgb2hsl(getLastFrameColor(uv + getRipple(uv)).grb);
    }
    if(c.y < 0.1) {
        c = rgb2hsl(getLastFrameColor(uv * spectralCentroidZScore).rgb);
    }
    if(c.y < 0.1) {
        c = rgb2hsl(getLastFrameColor(uv * spectralRoughnessZScore + getRipple(uv)).rgb);
    }
    if(c.y < 0.1) {
        c = rgb2hsl(getLastFrameColor(uv).rgb);
    }
    if(c.y < 0.1) {
        c.x = sin(c.x + time + uv.x * uv.y + spectralCentroid);
        c.y = sin(max(sin(time + uv.x * uv.y + spectralRoughness), 0.5));

    }

		// average this with neighbors to get a smoother result
		c += rgb2hsl(getLastFrameColor(uv + vec2(0.01, 0.0)).rgb)/2.;

		c += rgb2hsl(getLastFrameColor(uv + vec2(0.0, 0.01)).rgb)/2.;

		c /= mapValue(spectralCentroidZScore,-3.,3.,1.3,2.1);
		c.x+= uv.x/1000.;
		c.y+= uv.y/1000.;
		    // Emit the final color, the light in the darkness
    fragColor = vec4(c, 1.0);
}

