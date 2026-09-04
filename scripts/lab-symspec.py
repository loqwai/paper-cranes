# What ROTATIONAL SYMMETRY ORDER actually reaches the screen?
# For each render: scan candidate cell centres, polar-resample, and correlate the
# patch with itself rotated by TAU/N. Report the best score per N over all centres.
import sys, json
import numpy as np
from PIL import Image
B="D:/Projects/pc-lab-nfold/journals/lab/shots/"
NA=360; RAD=np.arange(6,96,3.0)          # 30 radii, r=6..93 px
NS=list(range(2,13))
ang=np.arange(NA)*2*np.pi/NA
CS=np.cos(ang)[None,:]*RAD[:,None]; SN=np.sin(ang)[None,:]*RAD[:,None]
def spec(path):
    I=np.asarray(Image.open(B+path).convert("L")).astype(np.float32)
    H,W=I.shape
    best={n:0.0 for n in NS}; where={n:None for n in NS}
    for cy in range(140,H-140,20):
        for cx in range(140,W-140,20):
            yi=np.clip(np.round(cy+SN).astype(int),0,H-1); xi=np.clip(np.round(cx+CS).astype(int),0,W-1)
            P=I[yi,xi]                                    # (radii, angles)
            P=P-P.mean(1,keepdims=True)
            nrm=np.sqrt((P*P).sum(1)); nrm[nrm<1e-3]=1e9
            if (nrm<1e6).sum()<8: continue
            for n in NS:
                k=NA//n
                if k*n!=NA: continue
                Q=np.roll(P,k,axis=1)
                c=float(((P*Q).sum(1)/(nrm*nrm)).mean())
                if c>best[n]: best[n]=c; where[n]=(cx,cy)
    return best
jobs=json.load(open(sys.argv[1]))
print("%-24s %-9s %s"%("render","truthN"," ".join("N%-2d "%n for n in NS)))
for j in jobs:
    s=spec(j["file"]); t=j["N"]
    top=max(NS,key=lambda n:s[n])
    # rank the TRUE N among the orders that are not multiples of 2 or 4 already forced by the fold
    print("%-24s N=%-7s %s   argmax=N%d%s"%(j["file"],t," ".join("%.2f"%s[n] for n in NS),top,
        "  <-- TRUTH" if top==t else ""))
