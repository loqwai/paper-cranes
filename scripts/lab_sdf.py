"""SDF-bake measurements for /lab. USE THIS, NOT A CANVAS.

TRAP #1 (HANDOFF §14) - I got this wrong and filed a false "bake defect" because of it:
NEVER read a baked SDF through canvas2D / drawImage + getImageData. Canvas stores
PREMULTIPLIED alpha, so wherever alpha == 0 the RGB is irrecoverably returned as 0. On
mon-*.png the exterior is alpha=0, so the green channel reads 0 there and the field looks
like it never goes positive. It does: exterior G is 128..200.

  python scripts/lab_sdf.py public/images/beads/mon-kiku.png

(Screenshot tools - lab-measure/lab-pitch/lab-repeat - may keep using canvas: rendered
frames are opaque, so premultiplication cannot destroy anything there.)
"""
import sys
import numpy as np
from PIL import Image

path = sys.argv[1] if len(sys.argv) > 1 else 'public/images/beads/mon-kiku.png'
R = float(sys.argv[2]) if len(sys.argv) > 2 else 0.6      # gHexR
a = np.array(Image.open(path).convert('RGBA')).astype(float)
G, A = a[:, :, 1], a[:, :, 3]
N = G.shape[0]
C = N / 2

print(f'{path}  {N}x{N}')
print(f'  G overall            {G.min():.0f}..{G.max():.0f} ({len(np.unique(G))} unique)')
print(f'  G exterior (alpha=0) {G[A == 0].min():.0f}..{G[A == 0].max():.0f}  n={(A == 0).sum()}')
print(f'  G interior (alpha>0) {G[A > 0].min():.0f}..{G[A > 0].max():.0f}')
d_row = G[N // 2] / 255.0 - 0.5
print(f'  zero crossings, centre row: {int((np.diff(np.sign(d_row)) != 0).sum())}')

# raw silhouette crossings per radial ray (alpha-based; safe either way)
th = np.linspace(0, 2 * np.pi, 720, endpoint=False)
rr = np.arange(1, int(C) - 2)
xs = (C + np.cos(th)[:, None] * rr).astype(int)
ys = (C + np.sin(th)[:, None] * rr).astype(int)
inside = A[ys, xs] > 127
cross = (np.diff(inside.astype(int), axis=1) != 0).sum(axis=1)
u, c = np.unique(cross, return_counts=True)
print(f'  silhouette crossings per ray: {dict(zip(u.tolist(), c.tolist()))}')

# effective crossings in cell space, after abs(p) mirroring + REPEAT wrap
s = np.arange(0, 1.4143, 0.002)
res = []
for t in np.linspace(0, np.pi / 2, 360):
    ux, uy = np.abs(np.cos(t) * s), np.abs(np.sin(t) * s)
    tx, ty = (ux / R * 0.5 + 0.5) % 1.0, (uy / R * 0.5 + 0.5) % 1.0
    dd = G[(ty * (N - 1)).astype(int), (tx * (N - 1)).astype(int)] / 255.0 - 0.5
    res.append(int((np.diff(np.sign(dd)) != 0).sum()))
res = np.array(res)
print(f'  effective crossings per cell-space ray: mean {res.mean():.2f} (min {res.min()} max {res.max()})')
print(f'  texCoordMax = {(1.4142 / R * 0.5 + 0.5):.3f}  (>1 means REPEAT wrap pulls in tiled copies)')
