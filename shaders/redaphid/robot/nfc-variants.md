# Robot NFC Variants

50 variants for `2cb.pw/robot-1` … `2cb.pw/robot-50`. Mirrors the taco lineup
(`shaders/redaphid/taco/nfc-variants.md`) but swaps the mask image to
`images/robot-stencil.png` so each bracelet renders the robot silhouette
instead of the taco. Seeds, knobs, controller, and `fft_size/smoothing` are
identical to the matching `taco-N` so `robot-N` is the robot-mask twin of
`taco-N`.

**All variants force `knob_7=0`** (silhouette fits in frame; non-zero knob_7 cuts the figure off the edges).

**Audio responsiveness:** all variants include `&fft_size=2048&smoothing=0.3` for low-latency reactivity on phones.

To regenerate after the taco list changes: `node scripts/gen-robot-variants.js`.

| # | Shader | seed | seed2 | seed3 | seed4 | k_2 | k_5 | Short |
|---|--------|------|-------|-------|-------|-----|-----|-------|
| 1 | plasma | 0.618 | 0.936 | 0.254 | 0.572 | 0 | 0 | `https://2cb.pw/robot-1` |
| 2 | plasma | 0.236 | 0.554 | 0.872 | 0.19 | 0.62 | 0.07 | `https://2cb.pw/robot-2` |
| 3 | plasma | 0.854 | 0.172 | 0.49 | 0.808 | 0.24 | 0.14 | `https://2cb.pw/robot-3` |
| 4 | plasma | 0.472 | 0.79 | 0.108 | 0.426 | 0.85 | 0.21 | `https://2cb.pw/robot-4` |
| 5 | plasma | 0.09 | 0.408 | 0.726 | 0.044 | 0.47 | 0.29 | `https://2cb.pw/robot-5` |
| 6 | plasma | 0.708 | 0.026 | 0.344 | 0.662 | 0.09 | 0.36 | `https://2cb.pw/robot-6` |
| 7 | plasma | 0.326 | 0.644 | 0.962 | 0.28 | 0.71 | 0.43 | `https://2cb.pw/robot-7` |
| 8 | plasma | 0.944 | 0.262 | 0.58 | 0.898 | 0.33 | 0.5 | `https://2cb.pw/robot-8` |
| 9 | plasma | 0.562 | 0.88 | 0.198 | 0.516 | 0.94 | 0.57 | `https://2cb.pw/robot-9` |
| 10 | plasma | 0.18 | 0.498 | 0.816 | 0.134 | 0.56 | 0.64 | `https://2cb.pw/robot-10` |
| 11 | plasma | 0.798 | 0.116 | 0.434 | 0.752 | 0.18 | 0.71 | `https://2cb.pw/robot-11` |
| 12 | plasma | 0.416 | 0.734 | 0.052 | 0.37 | 0.8 | 0.79 | `https://2cb.pw/robot-12` |
| 13 | plasma | 0.034 | 0.352 | 0.67 | 0.988 | 0.42 | 0.86 | `https://2cb.pw/robot-13` |
| 14 | plasma | 0.652 | 0.97 | 0.288 | 0.606 | 0.03 | 0.93 | `https://2cb.pw/robot-14` |
| 15 | plasma | 0.271 | 0.589 | 0.907 | 0.225 | 0.65 | 1 | `https://2cb.pw/robot-15` |
| 16 | seamless | 0.618 | 0.936 | 0.254 | 0.572 | 0 | 0 | `https://2cb.pw/robot-16` |
| 17 | seamless | 0.236 | 0.554 | 0.872 | 0.19 | 0.62 | 0.11 | `https://2cb.pw/robot-17` |
| 18 | seamless | 0.854 | 0.172 | 0.49 | 0.808 | 0.24 | 0.22 | `https://2cb.pw/robot-18` |
| 19 | seamless | 0.472 | 0.79 | 0.108 | 0.426 | 0.85 | 0.33 | `https://2cb.pw/robot-19` |
| 20 | seamless | 0.09 | 0.408 | 0.726 | 0.044 | 0.47 | 0.44 | `https://2cb.pw/robot-20` |
| 21 | seamless | 0.708 | 0.026 | 0.344 | 0.662 | 0.09 | 0.56 | `https://2cb.pw/robot-21` |
| 22 | seamless | 0.326 | 0.644 | 0.962 | 0.28 | 0.71 | 0.67 | `https://2cb.pw/robot-22` |
| 23 | seamless | 0.944 | 0.262 | 0.58 | 0.898 | 0.33 | 0.78 | `https://2cb.pw/robot-23` |
| 24 | seamless | 0.562 | 0.88 | 0.198 | 0.516 | 0.94 | 0.89 | `https://2cb.pw/robot-24` |
| 25 | seamless | 0.18 | 0.498 | 0.816 | 0.134 | 0.56 | 1 | `https://2cb.pw/robot-25` |
| 26 | rainbow-plume | 0.618 | 0.936 | 0.254 | 0.572 | 0.3 | 0 | `https://2cb.pw/robot-26` |
| 27 | rainbow-plume | 0.236 | 0.554 | 0.872 | 0.19 | 0.92 | 0.62 | `https://2cb.pw/robot-27` |
| 28 | rainbow-plume | 0.854 | 0.172 | 0.49 | 0.808 | 0.54 | 0.24 | `https://2cb.pw/robot-28` |
| 29 | rainbow-plume | 0.472 | 0.79 | 0.108 | 0.426 | 0.15 | 0.85 | `https://2cb.pw/robot-29` |
| 30 | rainbow-plume | 0.09 | 0.408 | 0.726 | 0.044 | 0.77 | 0.47 | `https://2cb.pw/robot-30` |
| 31 | rainbow-plume | 0.708 | 0.026 | 0.344 | 0.662 | 0.39 | 0.09 | `https://2cb.pw/robot-31` |
| 32 | confident-kick | 0.618 | 0.936 | 0.254 | 0.572 | 0.3 | 0 | `https://2cb.pw/robot-32` |
| 33 | confident-kick | 0.236 | 0.554 | 0.872 | 0.19 | 0.92 | 0.62 | `https://2cb.pw/robot-33` |
| 34 | confident-kick | 0.854 | 0.172 | 0.49 | 0.808 | 0.54 | 0.24 | `https://2cb.pw/robot-34` |
| 35 | confident-kick | 0.472 | 0.79 | 0.108 | 0.426 | 0.15 | 0.85 | `https://2cb.pw/robot-35` |
| 36 | live-iter | 0.618 | 0.936 | 0.254 | 0.572 | 0.3 | 0 | `https://2cb.pw/robot-36` |
| 37 | live-iter | 0.236 | 0.554 | 0.872 | 0.19 | 0.92 | 0.62 | `https://2cb.pw/robot-37` |
| 38 | live-iter | 0.854 | 0.172 | 0.49 | 0.808 | 0.54 | 0.24 | `https://2cb.pw/robot-38` |
| 39 | live-iter | 0.472 | 0.79 | 0.108 | 0.426 | 0.15 | 0.85 | `https://2cb.pw/robot-39` |
| 40 | cubic-ease | 0.618 | 0.936 | 0.254 | 0.572 | 0.3 | 0 | `https://2cb.pw/robot-40` |
| 41 | cubic-ease | 0.236 | 0.554 | 0.872 | 0.19 | 0.92 | 0.62 | `https://2cb.pw/robot-41` |
| 42 | cubic-ease | 0.854 | 0.172 | 0.49 | 0.808 | 0.54 | 0.24 | `https://2cb.pw/robot-42` |
| 43 | cubic-ease | 0.472 | 0.79 | 0.108 | 0.426 | 0.15 | 0.85 | `https://2cb.pw/robot-43` |
| 44 | outline-tunnel | 0.618 | 0.936 | 0.254 | 0.572 | 0.3 | 0 | `https://2cb.pw/robot-44` |
| 45 | outline-tunnel | 0.236 | 0.554 | 0.872 | 0.19 | 0.92 | 0.62 | `https://2cb.pw/robot-45` |
| 46 | outline-tunnel | 0.854 | 0.172 | 0.49 | 0.808 | 0.54 | 0.24 | `https://2cb.pw/robot-46` |
| 47 | outline-tunnel | 0.472 | 0.79 | 0.108 | 0.426 | 0.15 | 0.85 | `https://2cb.pw/robot-47` |
| 48 | region-mask | 0.618 | 0.936 | 0.254 | 0.572 | 0.3 | 0 | `https://2cb.pw/robot-48` |
| 49 | region-mask | 0.236 | 0.554 | 0.872 | 0.19 | 0.92 | 0.62 | `https://2cb.pw/robot-49` |
| 50 | region-mask | 0.854 | 0.172 | 0.49 | 0.808 | 0.54 | 0.24 | `https://2cb.pw/robot-50` |
