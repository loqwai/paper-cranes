#pragma glslify:import(./includes/full.frag)

vec2 centerUv(vec2 res,vec2 coord){
    // step 1: normalize the coord to 0-1
    vec2 uv=coord.xy/res;
    // step 2: center the uv
    uv-=.5;
    // step 3: scale the uv to -1 to 1
    uv*=2.;
    return uv;
}

vec4 getLastColor(vec2 uv){
    vec2 sampleUv=uv/2.;
    sampleUv+=.5;
    return getLastFrameColor(sampleUv);
}

vec4[8]getNeighbors(vec2 uv){
    vec2 onePixel=vec2(1.)/resolution;
    vec4 neighbors[8];
    neighbors[0]=getLastColor(uv+vec2(-onePixel.x,-onePixel.y));
    neighbors[1]=getLastColor(uv+vec2(0.,-onePixel.y));
    neighbors[2]=getLastColor(uv+vec2(onePixel.x,-onePixel.y));
    neighbors[3]=getLastColor(uv+vec2(-onePixel.x,0.));
    neighbors[4]=getLastColor(uv+vec2(onePixel.x,0.));
    neighbors[5]=getLastColor(uv+vec2(-onePixel.x,onePixel.y));
    neighbors[6]=getLastColor(uv+vec2(0.,onePixel.y));
    neighbors[7]=getLastColor(uv+vec2(onePixel.x,onePixel.y));
    return neighbors;
}
bool isAlive(vec4 color){
    return color.r>.5;
}
void init(vec2 uv){
    if(uv.x>2.*uv.y||uv.x<-2.*uv.y){
        fragColor=vec4(0.);
    }else{
        fragColor=vec4(1.);
    }
    return;
}
void main(void){
    vec2 uv=centerUv(resolution,gl_FragCoord.xy);
    if(frame>0){
        init(uv);
        return;
    }
}
