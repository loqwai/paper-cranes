import sys, json, numpy as np
from PIL import Image, ImageFilter

def lum(a):  # Rec.709 on 0..255
    return 0.2126*a[...,0] + 0.7152*a[...,1] + 0.0722*a[...,2]

def stats(path):
    im = Image.open(path).convert('RGB')
    a = np.asarray(im).astype(np.float32)
    L = lum(a)
    # brightness (full resolution, stated cutoffs)
    out = dict(mean=float(L.mean()),
               litPct=float((L > 20).mean()*100),
               brightPct=float((L > 50).mean()*100),
               darkPct=float((L < 5).mean()*100))
    # SEAM DETECTOR: a step discontinuity survives a large blur as a persistent
    # mean-level difference; a thin drawn line does not. Blur sigma 6 px, then
    # gradient magnitude. Reported as the 99.5th percentile over the median --
    # seams are a thin set of very high values, texture is the bulk.
    B = np.asarray(im.convert('L').filter(ImageFilter.GaussianBlur(6))).astype(np.float32)
    gx = np.diff(B, axis=1)[:-1, :]
    gy = np.diff(B, axis=0)[:, :-1]
    g = np.hypot(gx, gy)
    med = float(np.median(g)) + 1e-6
    out['seamP995'] = float(np.percentile(g, 99.5))
    out['seamRatio'] = out['seamP995']/med
    out['seamMean'] = float(g.mean())
    return out

if __name__ == '__main__':
    for p in sys.argv[1:]:
        s = stats(p)
        print(p.split('/')[-1].ljust(28),
              ' '.join(f'{k}={v:.2f}' for k, v in s.items()))
