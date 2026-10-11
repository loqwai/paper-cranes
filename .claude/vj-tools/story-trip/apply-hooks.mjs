import { readFileSync, writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const [src, dest = src] = process.argv.slice(2)
assert.ok(src, 'usage: node apply-hooks.mjs <in.frag> [out.frag]')
let s = readFileSync(src, 'utf8')
assert.ok(!s.includes('TRIP-HOOKS'), `${src} already has the trip hooks`)

const swap = (find, put, label) => {
  const n = s.split(find).length - 1
  assert.equal(n, 1, `hook "${label}": anchor found ${n} times, expected 1`)
  s = s.replace(find, () => put)
}

swap('hrCap((0.16 + knob_1 * 0.10)', 'hrCap((0.16 + 0.0 * 0.10)', 'K1 is TRIP now, not HOLE SIZE')

swap('uniform float bs_heat, bs_size, bs_power,',
  'uniform float bs_trip, bs_julia, bs_jR, bs_jTurn, bs_descend, bs_dive, bs_fractal, bs_tripHue;   // TRIP-HOOKS: K1 trip story (controller)\nuniform float bs_heat, bs_size, bs_power,',
  'uniforms')

swap('    vec2 c = 0.7885 * vec2(sin(th), cos(th));\n',
  '    float thT = 4.97 + 0.30 * sin(6.2831853 * bs_jTurn);   // TRIP: c wanders the connected band on a forward clock\n' +
  '    vec2 c = mix(0.7885 * vec2(sin(th), cos(th)), bs_jR * vec2(sin(thT), cos(thT)), bs_trip);\n',
  'juliaArms c')

const arms = s.indexOf('vec4 juliaArms(')
assert.ok(arms >= 0, 'hook "juliaArms reach": juliaArms() not found')
const sLine = s.slice(arms).match(/\n    float S = [^;\n]*;/)
assert.ok(sLine, 'hook "juliaArms reach": no `float S = …;` scale line in juliaArms()')
swap(sLine[0], sLine[0].slice(0, -1) + ' * (1.0 + 0.6 * bs_julia * bs_trip);', 'juliaArms reach')

swap('void mainImage(out vec4 O, in vec2 g) {', `// TRIP-GARDEN: a self-similar Julia sky about the screen centre (never anchored to the sun). Two
// octaves at scales 2^(o - fract(dive)) cross-fade so the dive wraps without a pop; colour is one OKLCH
// analogous family on bs_tripHue, with a counter-hue folded to stay at or below 300° (no magenta).
vec3 tripGarden(vec2 uv) {
    float thT = 4.97 + 0.30 * sin(6.2831853 * bs_jTurn);
    vec2 c = bs_jR * vec2(sin(thT), cos(thT));
    float h = bs_tripHue * 360.0;
    float hc = h < 150.0 ? h + 150.0 : h - 150.0;
    float fd = fract(bs_dive);
    vec3 acc = vec3(0.0);
    for (int o = 0; o < 2; o++) {
        vec2 z = uv * 1.6 * exp2(float(o) - fd);
        float n = 0.0;
        for (int i = 0; i < 28; i++) {
            z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
            if (dot(z, z) > 64.0) break;
            n += 1.0;
        }
        float k = n / 28.0;
        vec3 col = mix(gamutLch(vec3(0.30 + 0.35 * k, 0.12, radians(h + 25.0 * (k - 0.5)))),
                       gamutLch(vec3(0.45, 0.10, radians(hc))), smoothstep(0.85, 1.0, k));
        acc += pow(col, vec3(1.0 / 2.2)) * (o == 0 ? 1.0 - fd : fd);
    }
    return acc;
}

void mainImage(out vec4 O, in vec2 g) {`, 'tripGarden')

const bgLine = s.match(/\n    vec3 bg = mix\(sky\(uv, t, sm\), deepSpace\(uv\)[^\n]*\n/)
assert.ok(bgLine, 'hook "garden mix": bg line not found')
swap(bgLine[0], bgLine[0] +
  '    float gW = clamp(bs_fractal * bs_trip, 0.0, 1.0);\n' +
  '    if (gW > 0.003) bg = mix(bg, tripGarden(uv0) * (0.75 + 0.5 * bs_bassSus * GATE), gW * 0.8);   // TRIP-GARDEN: bass sustain breathes its light\n',
  'garden mix')

writeFileSync(dest, s)
console.log(`trip hooks applied: ${src} -> ${dest}`)
