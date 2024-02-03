#pragma glslify: export(hsl2rgb, hue2rgb)
float hue2rgb(float f1, float f2, float hue) {
    if (hue < 0.0)
        hue += 1.0;
    else if (hue > 1.0)
        hue -= 1.0;
    float res;
    if ((6.0 * hue) < 1.0)
        res = f1 + (f2 - f1) * 6.0 * hue;
    else if ((2.0 * hue) < 1.0)
        res = f2;
    else if ((3.0 * hue) < 2.0)
        res = f1 + (f2 - f1) * ((2.0 / 3.0) - hue) * 6.0;
    else
        res = f1;
    return res;
}

vec3 hsl2rgb(vec3 hsl){
float h=hsl.x;
float s=hsl.y;
float l=hsl.z;

float r,g,b;

if(s==0.f){
  r=g=b=l;// achromatic
}else{
  float q=l<.5f?l*(1.f+s):l+s-l*s;
  float p=2.f*l-q;
  r=hue2rgb(p,q,h+1.f/3.f);
  g=hue2rgb(p,q,h);
  b=hue2rgb(p,q,h-1.f/3.f);
}

return vec3(r,g,b);
}
