# Missing shader

A link to a shader this host does not have plays the default shader and shows a small corner note
`shader not found: <name>`, never a black screen and never a web page compiled as GLSL (#207).

## Sub-features

- `missing-default`: the default shader renders, lit.
- `missing-note`: a `role=status` note reads `shader not found: <name>`.
- `missing-not-html`: `window.cranes.shader` is GLSL, not the `index.html` a Pages fallback serves.
- `missing-editor`: `edit.html` with a missing shader opens on the default GLSL.

## How to get to it (user POV)

- Open `/?shader=does-not-exist-xyz` (a stale NFC tag, a typo, a shader deleted since).
- Open `/edit.html?shader=does-not-exist-xyz`.

## Driving it with Playwright

Preconditions:

- An instance from `$B launch`, or `--base` for a deployed site (the Pages fallback is where this
  broke, so a preview or production run matters).

- **Display.** Run `$B open "?shader=does-not-exist-xyz&noaudio=true&time=5" --canvas --viewport 390x844 --name missing --feature missing-shader --eval "({note: document.querySelector('[role=status]')?.textContent, html: /<!doctype html|<html/i.test(window.cranes.shader), len: window.cranes.shader.length})"`.
  Expect `note` = `shader not found: does-not-exist-xyz`, `html` false, `canvas.litFraction` > 0.2
  (2026-11-24 dev: note correct, `html` false, 407 chars, lit 1.0).
- **Editor.** Run `$B open "edit.html?shader=does-not-exist-xyz&noaudio=true" --name editor-missing --feature missing-shader --wait 3000 --eval "window.monaco?.editor?.getModels?.()[0]?.getValue()"`.
  Expect GLSL (`mainImage` or `void main`), not `<!doctype html`.
- **Proof.** `missing.png` (the note visible bottom-left), `missing-canvas.png`, `missing.json`.

## Gotchas

- The note is `pointer-events: none` and fixed bottom-left; a phone screenshot shows it, a canvas
  screenshot does not. Keep both.
- On a build, `edit.html` strips `?shader=` and reloads once; `--wait` covers it, or wait for the
  Monaco model to fill.
- Cloudflare Pages answers a missing `.frag` with `index.html` and 200, the case that broke
  (#207). The dev server and `vite preview` do not reproduce that fallback, so a local pass does
  not cover it: also run against a deployed site, or the smoke suite's Pages-like server.
