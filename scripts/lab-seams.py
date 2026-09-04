# EXACT continuity measurement of the fold recursion (geometry only, no shading).
# Reimplements fractal()'s fold+rotate loop in numpy and measures, per level, how
# often the DRAWN field (delt1 = |cellD - gRingGap|) jumps between horizontally
# adjacent samples by more than the drawn line half-width gBorder. That jump IS
# the seam: a step in the field the eye reads as a cut line.
import numpy as np
LEVELS, FIRST = 10, 4
GSCALE, THETA_STEP, TWIST_FALL = 2.0, np.pi/8, 0.05
HEXR, RINGGAP, BORDER = 0.60, 0.064, 0.10
SEED3, SEED4 = 0.33, 0.44
N = 4096          # samples per axis (row-chunked)
SPAN = float(__import__("os").environ.get("SPAN","1.0"))

def hexdist(x, y):
    dx, dy = np.abs(x), np.abs(y)
    m1 = 1.0/np.tan(np.pi/3); m2 = 1.0/np.sin(np.pi/3)
    return np.maximum(dx + dy*m1, np.maximum(dx, dy*m2))

def run(mode, CH=512):
    tile = mode in ('tile', 'lock')
    lock = mode == 'lock'
    g = ((np.arange(N)+0.5)/N*SPAN).astype(np.float64)
    hit = {i: 0 for i in range(FIRST, LEVELS)}; tot = 0
    for r0 in range(0, N, CH):
        px, py = np.meshgrid(g, g[r0:r0+CH])
        res = _one(px, py, tile, lock)
        for i, (h, t) in res.items():
            hit[i] += h
        tot += t
    return {i: hit[i]/tot*100 for i in hit}

def _one(px, py, tile, lock):
    res = {}
    for i in range(LEVELS):
        s = 2.0 if lock else GSCALE
        if tile:
            offx = np.sin(i*2.399 + SEED3*2*np.pi)*0.5 if lock else 0.0
            offy = np.cos(i*1.771 + SEED4*2*np.pi)*0.5 if lock else 0.0
            px = (np.mod(px+0.5+offx, 1.0)-0.5)*s
            py = (np.mod(py+0.5+offy, 1.0)-0.5)*s
        else:
            px = 1.0 - np.abs(s*np.mod(px-0.5, 1.0) - s*0.5)
            py = 1.0 - np.abs(s*np.mod(py-0.5, 1.0) - s*0.5)
        if lock:
            qstep = 1.0 + np.floor(SEED3*3.0)
            k = np.floor(np.mod(i*qstep + np.floor(SEED4*4.0), 4.0))
            c, sn = round(np.cos(k*np.pi/2)), round(np.sin(k*np.pi/2))
        else:
            th = i*THETA_STEP + 0.0 + 0.0 + (SEED3-0.5)*i*0.0
            c, sn = np.cos(th), np.sin(th)
        px, py = px*c - py*sn, px*sn + py*c
        if i < FIRST:
            continue
        bx, by = (px, py) if tile else (np.abs(px), np.abs(py))
        cellD = hexdist(bx, by) - HEXR            # hex proxy for the motif's cell field
        d1 = np.abs(cellD - RINGGAP)
        jump = np.abs(np.diff(d1, axis=1))
        # a seam is a jump larger than the line half-width; anything smaller is
        # indistinguishable from ordinary field variation at this sample pitch
        res[i] = (int((jump > BORDER).sum()), jump.size)
    return res

print(f'{"level":>6} {"MIRROR":>9} {"TILE":>9} {"LOCK":>9}   (% of adjacent sample pairs where the drawn field STEPS by > line half-width)')
r = {m: run(m) for m in ('mirror', 'tile', 'lock')}
for i in range(FIRST, LEVELS):
    print(f'{i:>6} {r["mirror"][i]:>9.3f} {r["tile"][i]:>9.3f} {r["lock"][i]:>9.3f}')
print('  ALL  ' + ' '.join(f'{np.mean([r[m][i] for i in range(FIRST,LEVELS)]):>9.3f}' for m in ('mirror','tile','lock')))
