# plasma — presets

Preset URLs for `redaphid/taco/plasma`. Three rendering modes; each can be combined with seed params for per-device uniqueness.

## Modes

**Mic (default — phones, NFC bracelets, public list page):**
```
?shader=redaphid/taco/plasma&image=images/taco-stencil.png&controller=taco-kandi
```

**Tab audio (Chrome desktop; share a SoundCloud/Spotify tab):**
```
?shader=redaphid/taco/plasma&image=images/taco-stencil.png&controller=taco-kandi&audio=tab
```

**Live jam editor:**
```
/jam.html?shader=redaphid/taco/plasma&image=images/taco-stencil.png&controller=taco-kandi&audio=tab
```

## Seeded variants (each phone/bracelet gets unique palette)

`seed`, `seed2`, `seed3`, `seed4` are floats in [0,1] that drive palette tilts, fractal phase offsets, and outline radiation density. Random combos produce visibly distinct visuals from the same shader.

| seed | seed2 | seed3 | seed4 | URL |
|------|-------|-------|-------|-----|
| 0.618 | 0.755 | 0.892 | 0.029 | `?shader=redaphid/taco/plasma&image=images/taco-stencil.png&controller=taco-kandi&seed=0.618&seed2=0.755&seed3=0.892&seed4=0.029` |
| 0.236 | 0.373 | 0.51 | 0.647 | `?shader=redaphid/taco/plasma&image=images/taco-stencil.png&controller=taco-kandi&seed=0.236&seed2=0.373&seed3=0.51&seed4=0.647` |
| 0.854 | 0.991 | 0.128 | 0.265 | `?shader=redaphid/taco/plasma&image=images/taco-stencil.png&controller=taco-kandi&seed=0.854&seed2=0.991&seed3=0.128&seed4=0.265` |
| 0.472 | 0.609 | 0.746 | 0.883 | `?shader=redaphid/taco/plasma&image=images/taco-stencil.png&controller=taco-kandi&seed=0.472&seed2=0.609&seed3=0.746&seed4=0.883` |
| 0.09 | 0.227 | 0.364 | 0.501 | `?shader=redaphid/taco/plasma&image=images/taco-stencil.png&controller=taco-kandi&seed=0.09&seed2=0.227&seed3=0.364&seed4=0.501` |

Note: NFC bracelets use the mic mode (no `audio=tab`) so they work on any phone without sharing a tab.
