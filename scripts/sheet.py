import sys, os
from PIL import Image, ImageDraw
# usage: sheet.py OUT.png COLS CELL "label=file" ...
out, cols, cell = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
items = [a.split('=',1) for a in sys.argv[4:]]
D = 'D:/Projects/pc-lab-hero/journals/lab/shots/'
rows = (len(items)+cols-1)//cols
pad, lab = 6, 20
sheet = Image.new('RGB', (cols*(cell+pad)+pad, rows*(cell+pad+lab)+pad), (20,20,24))
d = ImageDraw.Draw(sheet)
for i,(name,f) in enumerate(items):
    p = f if os.path.isabs(f) or '/' in f else D+f
    im = Image.open(p).convert('RGB').resize((cell,cell), Image.LANCZOS)
    x = pad + (i%cols)*(cell+pad); y = pad + (i//cols)*(cell+pad+lab)
    sheet.paste(im,(x,y)); d.text((x+2,y+cell+3), name, fill=(230,230,235))
sheet.save(out); print(out, sheet.size)
