import sys,glob,os,numpy as np
from PIL import Image
# Full-resolution lit coverage + mean luminance. PIL/numpy only -- never canvas2D
# (canvas2D premultiplies alpha; see HANDOFF s14.1).
rows=[]
for f in sorted(sum([glob.glob(p) for p in sys.argv[1:]],[])):
    a=np.asarray(Image.open(f).convert('RGB')).astype(np.float64)
    l=0.2126*a[...,0]+0.7152*a[...,1]+0.0722*a[...,2]
    rows.append((os.path.basename(f), l.mean(), 100*(l>20).mean(), 100*(l>50).mean(), l.max()))
w=max(len(r[0]) for r in rows)
print(f"{'file':<{w}}  {'meanLum':>7} {'lit>20%':>8} {'brt>50%':>8} {'max':>6}")
for r in rows: print(f"{r[0]:<{w}}  {r[1]:7.3f} {r[2]:8.2f} {r[3]:8.2f} {r[4]:6.0f}")
