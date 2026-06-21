# Tesla ChromaDepth set

Four of the best ChromaDepth shaders, re-cut for **the Tesla browser**: a weak GPU and
**no microphone**. Put on ChromaDepth 3D glasses (red = near, green = mid, blue/violet = far).

## The two things that make this set different

1. **Self-morphing with no mic.** The originals leaned on audio (bass/treble/energy z-scores,
   beat) to move. Here every dimension that audio *used* to drive is instead driven by
   **incommensurate `iTime` LFOs** — nested sines at irrational frequency ratios (φ, √2, √3)
   so the look drifts forever and never exactly repeats. They are alive with zero audio.
2. **The wavelet engine still wired in.** Each shader reads a few `wavelet-ease` controller
   springs (`waveletBassSpring`, `waveletCentroidSpring`, `waveletBand5Spring`, `energySpring`,
   `melodyFlow`) and **adds** them on top of the time morph. With no audio they read 0 → pure
   time morph. With line-in / `?audio=tab`, the music pushes the same dimensions harder.
3. **Trimmed for a weak GPU.** Fewer raymarch steps, fewer fractal iterations, fewer shells,
   cheap 4-tap normals, wireframe-only where the volume wasn't needed.

## URLs

Primary (no mic — guaranteed to run, pure time-morph):

| Shader | What it is | URL |
|--------|-----------|-----|
| **diamond** | 4D tesseract → glittering wireframe gem (the diamond) | `https://visuals.beadfamous.com/?shader=tesla/chromadepth/diamond&fullscreen=true&noaudio=true` |
| **geode** | nested icosahedral crystal shells | `https://visuals.beadfamous.com/?shader=tesla/chromadepth/geode&fullscreen=true&noaudio=true` |
| **crystal** | layered Voronoi crystal cavern | `https://visuals.beadfamous.com/?shader=tesla/chromadepth/crystal&fullscreen=true&noaudio=true` |
| **filigree** | Kali orbit-trap lacework | `https://visuals.beadfamous.com/?shader=tesla/chromadepth/filigree&fullscreen=true&noaudio=true` |

Audio-enhanced (when you have tab/line-in audio — drop `noaudio`, add the wavelet engine):

```
…?shader=tesla/chromadepth/diamond&fullscreen=true&wavelet=true&controller=wavelet-ease&audio=tab
```

## Per-shader notes

### diamond.frag  (the one that looks like a diamond)
A 4-D hypercube tumbling in 4 dimensions, perspective-projected to 3-D and raymarched as a
**wireframe gem**. The 4D rotation planes (XW/YW/ZW), the projection distance (the diamond
"breathes" between cube- and octahedron-like silhouettes), camera orbit and hue all drift on
separate LFOs. ChromaDepth depth = the original W coordinate of each edge (inner cell = far/blue,
outer cell = near/red), blended with ray distance.
*Tesla cuts:* 22 march steps (was 40), **edges only** — the 16 vertex spheres were dropped
(−⅓ SDF cost), cheap 4-tap tetrahedron normal.

### geode.frag
Three nested icosahedral shells with a triangular face lattice carved into gaps, orbited from
outside. Shell breathing, faceting frequency, gap width and rotation speed each drift on their
own LFO. Depth = shell index (outer→red, inner→violet).
*Tesla cuts:* 3 shells (was 4), 26 steps (was 40), removed the per-face audio pulse, 4-tap normal.

### crystal.frag
Three layers of animated Voronoi cells — large cells read near/red, tiny cells far/blue — with
glowing facet edges and sparkle. Cell-height pulse, animation speed, warp and seed drift are all
LFO-driven. The mic "beat ripple" is replaced by an **automatic radial ripple every ~3.3 s**.
Pure 2-D, cheap.

### filigree.frag
The Kali fold `p = abs(p)/dot(p,p) − c` makes recursive lacework; **orbit-trap** distances set
depth (tight orbits → red/near, far orbits → violet/far). The Kali parameter `c` wanders through
its beautiful range on several LFOs plus a very slow long-term drift so it keeps exploring new
configurations. Oklab feedback keeps the colour perceptually smooth and never greys out.
Pure 2-D, 10 fold iterations (was 12).

License: CC0.
