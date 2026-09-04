# Machine forced-choice: does a render correlate best with its OWN source mon?
# Normalised cross-correlation of the render against each mon's OUTLINE template,
# searched over scale and rotation. argmax over the 11 mon = the machine's guess.
import sys, json, math
import numpy as np
from PIL import Image
B="D:/Projects/pc-lab-nfold/"
MON=["hakkaku","katabami","kikko","kiku","kikyo","matsukawa","mokko","ogi","suhama","tomoe","ume"]
SC=[70,100,140,190,250]
ROT=list(range(0,360,30))

def outline(name):
    g=np.asarray(Image.open(B+"public/images/beads/mon-%s.png"%name).convert("RGB"))[:,:,1]
    m=(g<128).astype(np.uint8)*255
    return Image.fromarray(m)

TPL={}
for m in MON:
    im=outline(m); TPL[m]=[]
    for s in SC:
        base=im.resize((s,s),Image.LANCZOS)
        for r in ROT:
            a=np.asarray(base.rotate(r,resample=Image.BILINEAR,fillcolor=0)).astype(np.float32)/255.0
            # morphological-ish gradient -> the OUTLINE, which is what the shader draws
            e=np.abs(a-np.roll(a,1,0))+np.abs(a-np.roll(a,1,1))
            e=(e>0.3).astype(np.float32)
            if e.sum()<20: continue
            TPL[m].append(e)

def ncc_max(I, T):
    h,w=T.shape; H,W=I.shape
    n=float(h*w)
    T0=T-T.mean(); ts=math.sqrt(float((T0*T0).sum()))
    if ts<1e-6: return 0.0
    P=(1024,1024)
    FI=np.fft.rfft2(I,P); FI2=np.fft.rfft2(I*I,P)
    FT=np.fft.rfft2(T0[::-1,::-1],P)
    ones=np.ones((h,w),np.float32); FO=np.fft.rfft2(ones[::-1,::-1],P)
    num=np.fft.irfft2(FI*FT,P)[h-1:H,w-1:W]
    s1=np.fft.irfft2(FI*FO,P)[h-1:H,w-1:W]
    s2=np.fft.irfft2(FI2*FO,P)[h-1:H,w-1:W]
    var=np.maximum(s2-s1*s1/n,1e-6)
    return float((num/(np.sqrt(var)*ts)).max())

jobs=json.load(open(sys.argv[1]))
print("%-28s %-10s %-10s %s"%("render","truth","guess",'top-3'))
hits=0
for j in jobs:
    I=np.asarray(Image.open(B+"journals/lab/shots/"+j["file"]).convert("L")).astype(np.float32)
    sc={m:max(ncc_max(I,t) for t in TPL[m]) for m in MON}
    order=sorted(sc,key=lambda k:-sc[k])
    g=order[0]; ok=(g==j["truth"]); hits+=ok
    print("%-28s %-10s %-10s %s  %s"%(j["file"],j["truth"],g,
        ", ".join("%s %.3f"%(k,sc[k]) for k in order[:3]), "HIT" if ok else "miss"))
print("correct: %d/%d"%(hits,len(jobs)))
