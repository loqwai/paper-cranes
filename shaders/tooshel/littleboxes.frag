
#define PI 3.14159265359
#define rot(a)mat2(cos(a+PI*.25*vec4(0,6,2,0)))

#define MYTIME spectralCentroid
#define MYVAR1 trebleZScore
#define MYVAR2 bassZScore

vec3 hsv(in vec3 c){
    vec3 rgb=clamp(abs(mod(c.x*6.+vec3(0,4,2),6.)-3.)-1.,0.,1.);
    return c.z*mix(vec3(1),rgb,c.y);
}

float sdBox(in vec3 p,in vec3 b){
    vec3 d=abs(p)-b;
    return min(max(d.x,max(d.y,d.z)),0.)+length(max(d,0.));
}

vec2 hash22(in vec2 p){
    #define HASHSCALE3 vec3(.1031,.1030,.0973)
    vec3 p3=fract(vec3(p.xyx)*HASHSCALE3);
    p3+=dot(p3,p3.yzx+19.19);
    return fract((p3.xx+p3.yz)*p3.zy);
}

float perlin(in float x,in float seed){
    float a=floor(x);
    float b=a+1.;
    float f=x-a;
    f=f*f*(3.-2.*f);
    return mix(hash22(vec2(seed,a)).x,hash22(vec2(seed,b)).x,f);
}

// main distance function
float de(in vec3 p,in float r,out vec3 color){
    
    float d=-p.z;
    
    vec2 center=floor(p.xy)+.5;
    
    color=vec3(0);
    float colorAcc=0.;
    
    for(int x=-1;x<=1;x++){
        for(int y=-1;y<=1;y++){
            
            vec2 offset=center+vec2(x,y);
            vec3 inCenter=p-vec3(offset,0);
            
            // get random stuff for the cube
            vec2 rnd=hash22(offset);
            float height=1.+perlin(MYVAR2+rnd.x,rnd.y)*.75;
            //vec3 colorHere = hsv( vec3(-offset.y*0.1 + rnd.y*0.3, 1, 1) );
            vec3 colorHere=hsv(vec3(-offset.y*.1+MYVAR1*.3,1,1));
            // select the nearest cube
            float dist=sdBox(inCenter,vec3(vec2(.45),height))-.05;
            d=min(d,dist);
            // accumulate the color
            float alpha=max(.001,smoothstep(r,-r,dist));
            color+=colorHere*alpha;
            colorAcc+=alpha;
            
        }
    }
    
    color/=colorAcc;
    
    return d;
    
}

// normal function
vec3 normal(in vec3 p,float here){
    vec3 e=vec3(0.,.001,0.);
    vec3 dummy=vec3(0);
    return normalize(vec3(
            here-de(p-e.yxx,0.,dummy),
            here-de(p-e.xyx,0.,dummy),
            here-de(p-e.xxy,0.,dummy)));
        }
        
        // cone-tracing
        vec4 trace(in vec3 from,in vec3 dir,in float sinTheta){
            
            float totdist=.01;
            vec4 acc=vec4(0,0,0,1);
            
            for(int i=0;i<10;i++){
                
                vec3 p=from+totdist*dir;
                
                // find color here, as well as distance
                float r=totdist*sinTheta;
                vec3 color=vec3(0);
                float dist=de(p,r,color);
                
                // find opacity here
                float alpha=clamp(dist/r*-.5+.5,0.,1.);
                acc.rgb+=acc.a*alpha*color;
                acc.a*=1.-alpha;
                
                // break early if the accumulated opacity is almost zero
                if(acc.a<.01)break;
                // otherwise continue forward
                totdist+=abs(dist);
                
            }
            
            acc.a=1.-acc.a;
            return acc;
            
        }
        
        void mainImage(out vec4 fragColor,in vec2 fragCoord){
            
            vec2 uv=fragCoord.xy/iResolution.xy*2.-1.;
            uv.y*=iResolution.y/iResolution.x;
            
            vec3 from=vec3(MYTIME,.2*MYTIME,-5)+vec3(iMouse.xy*.04,0);
            vec3 dir=normalize(vec3(uv,.5));
            
            float totdist=0.;
            
            for(int steps=0;steps<20;steps++){
                vec3 p=from+totdist*dir;
                vec3 dummy=vec3(0);
                float dist=de(p,0.,dummy);
                totdist+=dist;
                if(dist<.001){
                    break;
                }
            }
            
            vec3 p=from+totdist*dir;
            vec3 color=vec3(0);
            vec3 norm=normal(p,de(p,.01,color));
            
            // glossy reflection
            vec3 refl=reflect(dir,norm);
            vec4 gloss=trace(p,refl,.5);
            gloss.rgb=mix(vec3(1),gloss.rgb,gloss.a);
            
            // fresnel
            float fres=pow(max(0.,dot(-dir,norm)),2.);
            
            fragColor.rgb=mix(color,gloss.rgb,fres);
            fragColor.a=1.;
            
        }