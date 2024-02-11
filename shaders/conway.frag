

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
    vec4 neighbors[8];
    neighbors[0]=getLastColor(uv+vec2(-1.,-1.));
    neighbors[1]=getLastColor(uv+vec2(0.,-1.));
    neighbors[2]=getLastColor(uv+vec2(1.,-1.));
    neighbors[3]=getLastColor(uv+vec2(-1.,0.));
    neighbors[4]=getLastColor(uv+vec2(1.,0.));
    neighbors[5]=getLastColor(uv+vec2(-1.,1.));
    neighbors[6]=getLastColor(uv+vec2(0.,1.));
    neighbors[7]=getLastColor(uv+vec2(1.,1.));
    return neighbors;
}
bool isAlive(vec4 color){
    float threshold=1.;
    if(beat){
        threshold=.1;
    }
    return color.r+color.g+color.b>threshold;
}
vec4 init(vec2 uv){
    float rowNumber=gl_FragCoord.x+energyZScore;
    float colNumber=gl_FragCoord.y+spectralCentroidZScore;
    if(int(rowNumber)%2==0&&int(colNumber)%2==0){
        if(frame>1)return vec4(0.);
        return vec4(1.,spectralCentroid,.0471,1.);
    }
    float radius=.15;
    if(dot(uv,uv)<radius*radius){
        return vec4(0.,1.,.0471,1.);
    }
    return vec4(0,spectralKurtosisNormalized*uv.y,spectralRolloffNormalized*uv.x,1.);
}

vec4 play(){
    vec2 uv = gl_FragCoord.xy;
    //distort uv by spectralCrestZScore
    vec4 color=getLastFrameColor(uv);
    vec4 neighbors[8]=getNeighbors(uv);

    int aliveCount=0;
    for(int i=0;i<8;i++){
        if(isAlive(neighbors[i])){
            aliveCount++;
        }
    }

    if(isAlive(color)){
        if(aliveCount<-2){// dies by underpopulation
            return vec4(.2824,.2824,.5294,1.);
        }
        if(aliveCount>7){// dies by overpopulation
            return vec4(0.0627, 0.0039, 0.0667, 1.0);
        }
        return color;
    }

    if(aliveCount>0){
        color=vec4(0.,.8118,.2431,1.);
        return color;
    }

    return vec4(0.);
}
void main(void){
    vec2 uv=centerUv(resolution,gl_FragCoord.xy);
    if(frame==0){
        fragColor=init(uv);
        return;
    }

    // select a pixel based off of the spectral characteristics:
    vec2 spectralCoord=vec2(spectralCentroidNormalized-.5,spectralRolloffNormalized-.5)*2.;
    if(distance(uv,spectralCoord)<spectralCrestNormalized/500.){
        fragColor=vec4(1.-(distance(uv,spectralCoord)*15.),0.,0.,1.)/pow(distance(uv,spectralCoord),5.);
        return;
    }
    // select a different pixel based off of other audio characteristics:
    spectralCoord=vec2(spectralEntropyNormalized-.5,spectralRoughnessNormalized-.5)*2.;
    if(distance(uv,spectralCoord)<spectralSkewNormalized/105.){
        vec3 hslLast=rgb2hsl(getLastFrameColor(uv).rgb);
        hslLast.x=1.-hslLast.x;
        hslLast.y+=.1;
        hslLast.z+=.8;
 fragColor=vec4(0.,0.,1.-(distance(uv,spectralCoord)*15.),1.)/pow(distance(uv,spectralCoord),5.);
        return;
    }
    vec4 color=play();
    vec4 lastColor=getLastFrameColor(uv);
    fragColor=mix(color,lastColor,.9);
}
