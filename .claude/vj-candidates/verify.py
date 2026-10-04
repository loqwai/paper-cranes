#!/usr/bin/env python3
"""Check every candidate anchor in patches.json hits EXACTLY ONCE in the current 3.frag.
Usage: python3 .claude/vj-candidates/verify.py [candidate_key]
Prints OK/AMBIGUOUS/MISSING per anchor. Also writes the patched text for one candidate to
the SCRATCHPAD as <key>.frag.txt when a key is given (NEVER a .frag under the project root: Vite watches .frag and full-reloads the jam page)."""
import json, sys, pathlib, hashlib
root = pathlib.Path(__file__).resolve().parents[2]
frag = (root / "shaders/redaphid/lattice-interactive/3.frag").read_text()
patches = json.loads((pathlib.Path(__file__).parent / "patches.json").read_text())
print("3.frag md5", hashlib.md5(frag.encode()).hexdigest(), "(patches verified against", patches["_verified_against_md5"] + ")")
keys = [k for k in patches if not k.startswith("_")]
only = sys.argv[1] if len(sys.argv) > 1 else None
for k in keys:
    if only and k != only: continue
    text = frag
    ok = True
    for i, p in enumerate(patches[k]):
        n = frag.count(p["old"])
        state = "OK" if n == 1 else ("AMBIGUOUS x%d" % n if n > 1 else "MISSING")
        if n != 1: ok = False
        print(f"  {k}[{i}] {state}")
        if n == 1: text = text.replace(p["old"], p["new"])
    print(f"{k}: {'READY' if ok else 'NEEDS RE-ANCHOR'}")
    if only and ok:
        out = pathlib.Path("/private/tmp/claude-503/-Users-redaphid-Worktrees-paper-crane-playwright/4414aeea-b960-4d52-84bc-087f731d3ed8/scratchpad")
        (out / f"{k}.frag.txt").write_text(text)
        print("  wrote", out / f"{k}.frag.txt")
