import sys, json
from PIL import Image, ImageDraw
D="D:/Projects/pc-lab-nfold/journals/lab/shots/"
spec=json.load(open(sys.argv[1]))
cell=spec.get("cell",300); out=spec["out"]
rows=spec["rows"]; cols=spec["cols"]
W=cell*len(cols); H=cell*len(rows)+22*len(rows)+22
im=Image.new("RGB",(W,H),(12,12,12)); dr=ImageDraw.Draw(im)
for ci,c in enumerate(cols): dr.text((ci*cell+6,5),c,fill=(230,230,230))
for ri,r in enumerate(rows):
    y=22+ri*(cell+22)
    dr.text((6,y),r["label"],fill=(255,220,120))
    for ci,f in enumerate(r["files"]):
        if not f: continue
        t=Image.open(D+f).convert("RGB").resize((cell,cell),Image.LANCZOS)
        im.paste(t,(ci*cell,y+16))
im.save(D+out); print("wrote",out,im.size)
