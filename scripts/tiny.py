import sys
from PIL import Image, ImageDraw
out, cols, cell, scale = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), float(sys.argv[4])
items=[a.split('=',1) for a in sys.argv[5:]]
D='D:/Projects/pc-lab-hero/journals/lab/shots/'
rows=(len(items)+cols-1)//cols; pad,lab=8,18
sh=Image.new('RGB',(cols*(cell+pad)+pad, rows*(cell+pad+lab)+pad),(0,0,0)); d=ImageDraw.Draw(sh)
for i,(n,f) in enumerate(items):
    im=Image.open(D+f).convert('RGB')
    t=int(im.size[0]*scale)
    im=im.resize((t,t), Image.LANCZOS).resize((cell,cell), Image.NEAREST)
    x=pad+(i%cols)*(cell+pad); y=pad+(i//cols)*(cell+pad+lab)
    sh.paste(im,(x,y)); d.text((x+2,y+cell+2), n, fill=(200,200,205))
sh.save(out); print(out, sh.size)
