const float PI = 3.14159265358979323844;

bool intersects(vec3 ro, vec3 rd, vec3 box_min, vec3 box_max, out float t_intersection)
{
    float t_near = -1e6;
    float t_far = 1e6;

    vec3 normal = vec3(0.);

    for (int i = 0; i < 3; i++) {
        if (rd[i] == 0.) {
            // ray is parallel to plane
            if (ro[i] < box_min[i] || ro[i] > box_max[i])
                return false;
        } else {
            vec2 t = vec2(box_min[i] - ro[i], box_max[i] - ro[i])/rd[i];

            if (t[0] > t[1])
                t = t.yx;

            t_near = max(t_near, t[0]);
            t_far = min(t_far, t[1]);

            if (t_near > t_far || t_far < 0.)
                return false;
        }
    }

    t_intersection = t_near;

    return true;
}
float rand(float n)
{
float fl = floor(n);
float fc = fract(n);
return mix(fract(sin(fl)), fract(sin(fl + 1.0)), fc);
}

// 2次元の乱数
vec2 rand2(in vec2 p)
{
return fract(
vec2(
sin(p.x * 1.32 + p.y * 54.077),
cos(p.x * 91.32 + p.y * 9.077)
)
);
}

// iq氏のウェブページを参考に,ボロノイエッヂを生成する
// https://www.iquilezles.org/www/articles/voronoilines/voronoilines.htm
float voronoi(in vec2 v, in float e)
{
vec2 p = floor(v);
vec2 f = fract(v);

vec2 res = vec2(8.0);

for(int j = -1; j <= 1; ++j)
for(int i = -1; i <= 1; ++i)
{
vec2 b = vec2(i, j);
vec2 r = b - f + rand2(p + b);

// 基盤感を出すため,チェビシフ距離を用いる
float d = max(abs(r.x), abs(r.y));

if(d < res.x)
{
res.y = res.x;
res.x = d;
}

else if(d < res.y)
{
res.y = d;
}
}

vec2 c = sqrt(res);
float dist = c.y - c.x;

// 最終的に出力されるのは,指定された濃さのエッヂ
return 1.0 - smoothstep(0.0, e, dist);
}

// 平面上における回転
mat2 rotate(in float a)
{
return mat2(cos(a), -sin(a), sin(a), cos(a));
}

mat3 camera(vec3 e, vec3 la) {
    vec3 roll = vec3(0, 1, 0);
    vec3 f = normalize(la - e);
    vec3 r = normalize(cross(roll, f));
    vec3 u = normalize(cross(f, r));

    return mat3(r, u, f);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
vec2 mouse =(iMouse.xy - .5*iResolution.xy)/iResolution.y;
   vec2 resolution = iResolution.xy-0.5;
   float time = iTime;
    vec2 uv = (2.*gl_FragCoord.xy - resolution)/min(resolution.x, resolution.y);


vec2 uv2=  gl_FragCoord.xy / resolution * 4.0 - 23.0;
uv2.y *= resolution.y / resolution.x;
uv2*= rotate(0.3);

// 最終的に出力する色の値
float value = 0.0;
float light = 0.0;

float f = 1.0;    // UV座標にかける値
float a = 0.7;    // valueに加える値の係数


for(int i = 0; i < 3; ++i)
{
// 導線が通っているように見せるやつ
float v1 = voronoi(uv * f + 1.0 + time * 0.2 , 0.1);
v1 = pow(v1, 2.0);
value += a * rand(v1 * 5.5 + 0.1);

// 電気が通ってる感じに見せるやつ
float v2 = voronoi(uv * f * 1.5 + 5.0 + time, 0.2) * 1.1;
v2 = pow(v2, 5.0);
light += pow(v1 * (0.5 * v2), 1.5);

// 係数諸々を変更
f *= 2.0;
a *= 0.6;
}

// 出力する色の決定
vec3 color;
color += vec3(0.0, 0.5, 1.0) * value;
color += vec3(0.4, 0.7, 1.0) * light;

    float a2 = .75*time;

    vec3 ro = 10.0*vec3(cos(a2), 1.0, -sin(a));
    vec3 rd = camera(ro, vec3(0))*normalize(vec3(uv, 0.5));

    const float INFINITY = 1e6;

    float t_intersection = INFINITY;

    const float cluster_size = 5.;
    float inside = 0.;

    for (float i = 0.; i < cluster_size; i++) {
        for (float j = 0.; j < cluster_size; j++) {
            for (float k = 0.; k < cluster_size; k++) {
                vec3 p = 1.75*(vec3(i, j, k) - .5*vec3(cluster_size - 1.));
float l = length(p);

                float s = 2.0*(.05 + .505*sin(.25*time*4.*PI - 4.5*l));

                float t = 0.;

                if (intersects(ro, rd, p - vec3(s), p + vec3(s), t) && t < t_intersection) {
                    t_intersection = t;

                    vec3 n = ro + rd*t_intersection - p;

                    const float EPSILON = .05;
                    vec3 normal = step(vec3(s - EPSILON), n) + step(vec3(s - EPSILON), -n);

                    inside = step(2., normal.x + normal.y + normal.z);
                }
            }
        }
    }

    vec4 c;

    if (t_intersection == INFINITY)
        c = mix(vec4(.1, .1, .1, 1.)*10., vec4(0., 0., 0., 0.), .5*length(uv));
    else
        c = inside*vec4(1., 0., 13., 1.);

 fragColor = c;

 fragColor*= vec4(color*10.,1.);
}

