# Machine forced-choice: does a render correlate best with its OWN source mon?
# Quarter-scale normalised cross-correlation, searched over scale + rotation.
import sys, json, math
import numpy as np
from PIL import Image
B="D:/Projects/pc-lab-nfold/"
MON=["hakkaku","katabami","kikko","kiku","kikyo","matsukawa","mokko","ogi","suhama","tomoe","ume"]
SC=[18,25,35,48,64]; ROT=list(range(0,360,30)); P=(256,256)
def outline(name):
    g=np.asarray(Image.open(B+"public/images/beads/mon-%s.png"%name).convert("RGB"))[:,:,1]
    return Image.fromarray(((g<128).astype(np.uint8)*255))
TPL={}
for m in MON:
    im=outline(m); TPL[m]=[]
    for s in SC:
        for r in ROT:
            a=np.asarray(im.resize((s,s),Image.LANCZOS).rotate(r,resample=Image.BILINEAR,fillcolor=0)).astype(np.float32)/255.
            e=((np.abs(a-np.roll(a,1,0))+np.abs(a-np.roll(a,1,1)))>0.3).astype(np.float32)
            if e.sum()<12: continue
            T0=e-e.mean(); ts=math.sqrt(float((T0*T0).sum()))
            TPL[m].append((s,np.conj(np.fft.rfft2(T0[::-1,::-1],P)),np.conj(np.fft.rfft2(np.ones((s,s),np.float32)[::-1,::-1],P)),ts))
def scores(path):
    I=np.asarray(Image.open(path).convert("L").resize((225,225),Image.LANCZOS)).astype(np.float32)
    FI=np.fft.rfft2(I,P); FI2=np.fft.rfft2(I*I,P); H=W=225
    out={}
    for m in MON:
        best=0.
        for s,FT,FO,ts in TPL[m]:
            n=float(s*s)
            num=np.fft.irfft2(FI*np.conj(FT),P)[s-1:H,s-1:W]
            s1=np.fft.irfft2(FI*np.conj(FO),P)[s-1:H,s-1:W]
            s2=np.fft.irfft2(FI2*np.conj(FO),P)[s-1:H,s-1:W]
            v=np.maximum(s2-s1*s1/n,1e-6)
            best=max(best,float((num/(np.sqrt(v)*ts)).max()))
        out[m]=best
    return out
jobs=json.load(open(sys.argv[1])); hits=0; per={}
for j in jobs:
    sc=scores(B+"journals/lab/shots/"+j["file"])
    order=sorted(sc,key=lambda k:-sc[k]); g=order[0]; ok=(g==j["truth"]); hits+=ok
    rank=order.index(j["truth"])+1
    per.setdefault(j.get("group","-"),[0,0,[]]); per[j["group"]][0]+=ok; per[j["group"]][1]+=1; per[j["group"]][2].append(rank)
    print("%-26s truth=%-10s guess=%-10s rank_of_truth=%2d  %s  [%s]"%(j["file"],j["truth"],g,rank,"HIT" if ok else "miss",
        ", ".join("%s %.3f"%(k,sc[k]) for k in order[:3])))
print()
for g,(h,n,rk) in per.items(): print("GROUP %-8s  correct %d/%d   mean rank of truth %.2f"%(g,h,n,sum(rk)/len(rk)))
print("TOTAL %d/%d (chance = %.1f/%d)"%(hits,len(jobs),len(jobs)/11.,len(jobs)))
