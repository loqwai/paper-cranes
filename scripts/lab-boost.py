import sys,os,numpy as np
from PIL import Image
# Gamma-boost a capture for VISUAL judgement only. Never measure from these.
g=float(sys.argv[1])
for f in sys.argv[2:]:
    a=np.asarray(Image.open(f).convert("RGB")).astype(np.float64)/255.0
    b=np.clip(a**g,0,1)
    o=os.path.join(os.path.dirname(f),"b-"+os.path.basename(f))
    Image.fromarray((b*255).astype(np.uint8)).save(o); print(o)
