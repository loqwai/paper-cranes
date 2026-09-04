import numpy as np, glob, os, math
from PIL import Image
print("%-11s %5s %6s %8s %8s  %s" % ("mon","size","rotC","cx_off","cy_off","order about image centre (k:err)"))
rows={}
for f in sorted(glob.glob(r"D:/Projects/pc-lab-nfold/public/images/beads/mon-*.png")):
    nm=os.path.basename(f)[4:-4]
    im=np.asarray(Image.open(f).convert("RGB")).astype(np.float32)/255.0
    g=im[:,:,1]
    m=(g<0.5)                              # inside the silhouette
    H,W=m.shape
    ys,xs=np.nonzero(m)
    a=m.sum()
    cx=xs.mean(); cy=ys.mean()
    Y,X=np.mgrid[0:H,0:W]
    def err(k,ox,oy):
        th=2*math.pi/k; ca,sa=math.cos(th),math.sin(th)
        # sample rotated source (inverse rotate the query grid)
        sx= ox + (X-ox)*ca + (Y-oy)*sa
        sy= oy - (X-ox)*sa + (Y-oy)*ca
        xi=np.clip(np.round(sx).astype(int),0,W-1); yi=np.clip(np.round(sy).astype(int),0,H-1)
        r=m[yi,xi]
        return float((m^r).sum())/a
    # about centroid
    best_c=1
    for k in range(2,17):
        if err(k,cx,cy)<0.03: best_c=k
    # about image centre
    ic=(W-1)/2.0; icy=(H-1)/2.0
    best_i=1; errs=[]
    for k in range(2,17):
        e=err(k,ic,icy); errs.append((k,e))
        if e<0.03: best_i=k
    top=", ".join("%d:%.3f"%(k,e) for k,e in errs if e<0.15)
    rows[nm]=(best_c,best_i)
    print("%-11s %5d %6d %8.2f %8.2f  best=%2d  %s" % (nm,W,best_c,cx-ic,cy-icy,best_i,top))
