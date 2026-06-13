# robot-kandi

## Concept
Kandi bracelet variants using the robot stencil. Same shaders, controller, seeds, and knobs as `taco/*` — only the mask changes from `images/taco-stencil.png` to `images/robot-stencil.png`. Each phone gets a unique-looking robot via the `seed`/`seed2`/`seed3`/`seed4` mapping baked into the shader.

## Mask
`public/images/robot-stencil.png` — 1024×1024 RGBA. Transparent outside, white interior, black outline (matches the taco-stencil format). Generated from `D:\Projects\nfc-bead\beads\robot\robot.svg` via `scripts/gen-robot-mask.py`.

## Variants
50 NFC URLs in [`nfc-variants.md`](nfc-variants.md) / [`nfc-variants.json`](nfc-variants.json). `robot-N` is the robot-mask twin of `taco-N` — identical shader/seed/knob/audio settings.

Regenerate with `node scripts/gen-robot-variants.cjs` after the taco list changes.

## Knobs / seeds
Same as taco — see `shaders/redaphid/taco/README.md`.

## Preview URL (localhost)
```
http://localhost:6969/?shader=redaphid/taco/plasma&image=images/robot-stencil.png&controller=taco-kandi&seed=0.618&seed2=0.936&seed3=0.254&seed4=0.572&knob_7=0.0
```
