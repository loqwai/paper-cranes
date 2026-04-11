# Errata — Known Gotchas

## Images must go in `public/images/`, not `images/`

Cloudflare Pages only serves static assets from the `public/` directory. If you put an image in the repo-root `images/` folder, it will exist in the repo but **will not be deployed** — the URL will return an HTML fallback page instead of the image, and `getInitialFrameColor()` will silently fail.

**Correct:**
```
public/images/my-image.png
```

**Wrong:**
```
images/my-image.png
```

The shader `?image=` parameter uses paths relative to the site root, so `?image=images/my-image.png` resolves to `public/images/my-image.png` at build time.

You can verify an image is deployed correctly by checking the `content-type` header:
```bash
curl -sI "https://visuals.beadfamous.com/images/my-image.png" | grep content-type
# Good: content-type: image/png
# Bad:  content-type: text/html; charset=utf-8  ← not actually serving the image
```
