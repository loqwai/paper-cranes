"""Build the self-contained gallery page from the rendered tiles.

Kept as a file rather than a heredoc because the CSS/HTML is full of quote characters
that fight shell heredoc parsing. Reads journals/lab/shots/gallery-tiles.json (which
carries the base64 JPEG for each curated look) and writes gallery.html next to it.
"""
import json
import io
import html

TILES = "journals/lab/shots/gallery-tiles.json"
MONS = "journals/lab/shots/gallery-mon.json"
OUT = "journals/lab/shots/gallery.html"
PREVIEW = "https://lab-substrate2.paper-cranes-visuals.pages.dev"

tiles = json.load(io.open(TILES, encoding="utf-8"))
mons = json.load(io.open(MONS, encoding="utf-8"))


def card(t):
    u = html.escape(PREVIEW + t["live"])
    return f"""    <a class="look" href="{u}" target="_blank" rel="noopener">
      <img src="data:image/jpeg;base64,{t['b64']}" alt="{html.escape(t['name'])}" loading="lazy">
      <div class="meta">
        <h3>{html.escape(t['name'])}</h3>
        <p>{html.escape(t['note'])}</p>
        <dl class="params">
          <div><dt>theme</dt><dd>{t['theme']}</dd></div>
          <div><dt>pShift</dt><dd>{t['ps']}</dd></div>
          <div><dt>navZoom</dt><dd>{t['z']}</dd></div>
        </dl>
      </div>
    </a>"""


def moncard(t):
    """A bead. The name is the point of the page, so it gets the emphasis."""
    u = html.escape(PREVIEW + t["live"])
    return f"""    <a class="bead" href="{u}" target="_blank" rel="noopener">
      <img src="data:image/jpeg;base64,{t['b64']}" alt="{html.escape(t['name'])}" loading="lazy">
      <div class="meta">
        <h3>{html.escape(t['name'])}</h3>
        <p>{html.escape(t['note'])}</p>
      </div>
    </a>"""


HEAD = """<title>Mon Lattice Presets</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=Archivo:wght@400;500&family=JetBrains+Mono:wght@400;600&display=swap">
<style>
  :root{
    --ground:#0A0A0D; --surface:#15151C; --raised:#1C1C25; --line:#26262F;
    --ink:#EDEAF2; --muted:#8E8A9B; --dim:#615D70; --accent:#E8643C; --accent-dim:#8A3A22;
    --display:"Bricolage Grotesque","Archivo",system-ui,sans-serif;
    --body:"Archivo",system-ui,-apple-system,sans-serif;
    --mono:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace;
    --sp:clamp(16px,3.2vw,30px);
  }
  *{box-sizing:border-box}
  body{background:var(--ground);color:var(--ink);font-family:var(--body);
       font-size:15px;line-height:1.6;-webkit-font-smoothing:antialiased}
  .wrap{max-width:1180px;margin:0 auto;padding:var(--sp) var(--sp) 64px}

  header{display:flex;flex-direction:column;gap:10px;padding:8px 0 26px;border-bottom:1px solid var(--line)}
  .eyebrow{font-family:var(--mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
  h1{font-family:var(--display);font-weight:700;font-size:clamp(30px,6vw,50px);line-height:1.02;
     letter-spacing:-.022em;margin:0;text-wrap:balance}
  .lede{margin:0;max-width:62ch;color:var(--muted);font-size:16px}
  .lede strong{color:var(--ink);font-weight:500}

  h2{font-family:var(--display);font-weight:700;font-size:22px;letter-spacing:-.012em;
     margin:52px 0 4px;text-wrap:balance}
  .sec-note{margin:0 0 20px;color:var(--muted);max-width:66ch}

  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(248px,1fr));gap:16px;margin-top:22px}
  .look{display:flex;flex-direction:column;text-decoration:none;color:inherit;
        background:var(--surface);border:1px solid var(--line);border-radius:3px;overflow:hidden;
        transition:border-color .18s ease,transform .18s ease}
  .look:hover,.look:focus-visible{border-color:var(--accent-dim);transform:translateY(-2px)}
  .look:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
  .look img{width:100%;aspect-ratio:1;object-fit:cover;display:block;background:#000}

  /* The bead grid carries the page's one moment of emphasis: it is the result the whole
     project exists for, so it gets a warmer surface and a name set in the display face. */
  .beads{display:grid;grid-template-columns:repeat(auto-fill,minmax(214px,1fr));gap:14px;margin-top:22px}
  .bead{display:flex;flex-direction:column;text-decoration:none;color:inherit;
        background:var(--surface);border:1px solid var(--line);border-radius:3px;overflow:hidden;
        transition:border-color .18s ease,transform .18s ease}
  .bead:hover,.bead:focus-visible{border-color:var(--accent);transform:translateY(-2px)}
  .bead:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
  .bead img{width:100%;aspect-ratio:1;object-fit:cover;display:block;background:#000}
  .bead .meta{padding:11px 13px 13px;gap:3px}
  .bead h3{font-family:var(--display);font-weight:700;font-size:17px;margin:0;letter-spacing:-.01em}
  .bead p{margin:0;font-size:12.5px;color:var(--muted)}

  .recipe{display:flex;flex-wrap:wrap;gap:9px;margin-top:18px}
  .recipe span{font-family:var(--mono);font-size:12.5px;background:var(--raised);
               border:1px solid var(--line);border-radius:2px;padding:6px 11px;color:var(--muted)}
  .recipe span b{color:var(--accent);font-weight:600}
  .meta{padding:13px 14px 14px;display:flex;flex-direction:column;gap:7px;flex:1}
  .meta h3{font-family:var(--display);font-weight:500;font-size:16.5px;margin:0;letter-spacing:-.008em}
  .meta p{margin:0;font-size:13px;line-height:1.45;color:var(--muted);flex:1}
  .params{display:flex;gap:14px;margin:2px 0 0;padding-top:9px;border-top:1px solid var(--line);
          font-family:var(--mono);font-size:11px;font-variant-numeric:tabular-nums}
  .params div{display:flex;gap:5px}
  .params dt{color:var(--dim);margin:0}
  .params dd{color:var(--accent);margin:0;font-weight:600}

  .callout{margin-top:26px;padding:16px 18px;background:var(--raised);
           border-left:2px solid var(--accent);border-radius:0 3px 3px 0}
  .callout h3{font-family:var(--display);font-size:15px;font-weight:700;margin:0 0 7px}
  .callout p{margin:0 0 8px;font-size:14px;color:var(--muted)}
  .callout p:last-child{margin-bottom:0}
  code{font-family:var(--mono);font-size:12.5px;color:var(--accent);
       background:rgba(232,100,60,.09);padding:1.5px 5px;border-radius:2px}

  .findings{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:18px;margin-top:22px}
  .finding{background:var(--surface);border:1px solid var(--line);border-radius:3px;padding:17px 18px}
  .finding .tag{font-family:var(--mono);font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;
                color:var(--dim);display:block;margin-bottom:8px}
  .finding h3{font-family:var(--display);font-size:16px;font-weight:700;margin:0 0 8px;letter-spacing:-.008em}
  .finding p{margin:0 0 9px;font-size:13.5px;color:var(--muted);line-height:1.55}
  .finding p:last-child{margin-bottom:0}

  .tblwrap{overflow-x:auto;margin-top:18px;border:1px solid var(--line);border-radius:3px}
  table{border-collapse:collapse;width:100%;font-size:13.5px;min-width:430px}
  caption{text-align:left;padding:13px 16px 11px;color:var(--muted);font-size:13px;
          border-bottom:1px solid var(--line)}
  th,td{padding:10px 16px;text-align:left;border-bottom:1px solid var(--line)}
  tr:last-child td{border-bottom:none}
  th{font-family:var(--mono);font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;
     color:var(--dim);font-weight:400}
  td.num{font-family:var(--mono);font-variant-numeric:tabular-nums;text-align:right}
  .win{color:var(--accent);font-weight:600}
  tbody tr.best{background:rgba(232,100,60,.055)}

  footer{margin-top:56px;padding-top:20px;border-top:1px solid var(--line);
         color:var(--dim);font-size:13px}
  footer code{color:var(--muted);background:none;padding:0}
  @media (prefers-reduced-motion:reduce){*{transition:none!important}}
</style>

<div class="wrap">
  <header>
    <span class="eyebrow">lattice-bead / 3.frag &middot; overnight run</span>
    <h1>Mon Lattice Presets</h1>
    <p class="lede">The overnight run ended somewhere better than it started: <strong>the bead is legible</strong>. All eleven crests now read as themselves. Below them, twelve palette looks from a 32-tile sweep. Tap anything to play it &mdash; tiles are frozen frames (<code>time=8</code>) so the comparison is honest, links are live and audio-reactive.</p>
  </header>

  <h2>The eleven beads</h2>
  <p class="sec-note">This is the acceptance test: a stranger, at a distance, in a dark room, should be able to <strong>name their own bead</strong>. It had failed at every framing and every seed pitch until tonight. On <code>4.frag</code> each of these is individually nameable &mdash; and it holds live, with audio running and the camera moving, not just on a frozen frame.</p>
  <div class="beads">
MON_HERE
  </div>

  <div class="callout">
    <h3>Why it was failing, and the fix</h3>
    <p>The cause was <strong>figure/ground</strong>. <code>3.frag</code> deliberately let the lattice texture survive <em>inside</em> the motif &mdash; its own comment calls that a feature. But interior and exterior then carry the same contrast, so the eye has no silhouette to lock onto and the shape never resolves. The measurements agreed: 76.1% common effect with only 7.9pt of between&#8209;motif spread.</p>
    <p><code>4.frag</code> adds one hand lever, <code>legible</code>, which collapses the interior toward the bead&rsquo;s own ink, deepens the ground recede, and widens the contour into a drawn line. Every term is mask&#8209;bound and spatially structured &mdash; no global multiplier, so none of it can strobe &mdash; and it is a hand knob, so no geometry moves with the music.</p>
    <div class="recipe">
      <span>knob_169 <b>0.60</b></span>
      <span>navZoom <b>0.14</b></span>
      <span>legible <b>1</b></span>
      <span>knob_168 <b>1.0</b></span>
    </div>
  </div>

  <div class="tblwrap">
    <table>
      <caption>Cell size is a prerequisite &mdash; and it is a <strong>window</strong>, not a maximum. Past 0.75 the camera sits inside a single bead and the silhouette is gone entirely.</caption>
      <thead><tr><th>knob_169</th><th>Cell pitch (uv)</th><th>Reads as</th></tr></thead>
      <tbody>
        <tr><td class="num">0.28 <span style="color:var(--dim)">shipped</span></td><td class="num">0.074</td><td>a fine texture &mdash; no shape at all</td></tr>
        <tr class="best"><td class="num win">0.55 &ndash; 0.65</td><td class="num">0.33 &ndash; 0.57</td><td><span class="win">the bead, with dark ground around it</span></td></tr>
        <tr><td class="num">0.75</td><td class="num">1.00</td><td>edge of usable</td></tr>
        <tr><td class="num">0.85 &ndash; 0.95</td><td class="num">1.74 &ndash; 3.03</td><td>inside one bead &mdash; no silhouette</td></tr>
      </tbody>
    </table>
  </div>

  <h2>Palette looks</h2>
  <p class="sec-note">Ordered roughly by hue. Every one of these avoids <code>paletteShift=1.7</code> and <code>theme=3</code>, for the reasons below.</p>
  <div class="grid">
"""

TAIL = """
  </div>

  <div class="callout">
    <h3>Two parameters are not optional</h3>
    <p><code>?wavelet=true</code> &mdash; without it all seven wavelet springs read exactly <code>0.000</code>, so <code>bassLive</code>, <code>midsLive</code> and <code>trebLive</code> are dead and most of the shader is deaf. The synthetic bench <em>pins</em> these, so it is structurally blind to this and will never catch it.</p>
    <p><code>?onset_refractory_ms=380</code> &mdash; at the default the onset detector free-runs at about 213&nbsp;BPM, chasing hats instead of the kick.</p>
  </div>

  <h2>What the sweep settled</h2>
  <p class="sec-note">Two of these are negative results. They are the more useful ones &mdash; they close off directions that look promising and are not.</p>
  <div class="findings">
    <div class="finding">
      <span class="tag">Actionable</span>
      <h3>The shipped default is the weakest column</h3>
      <p><code>paletteShift=1.7</code> is the current default, and across all four themes it produces the washed pink&#8209;lilac you flagged as &ldquo;fuzzy terrible fuchsia&rdquo;. The strong looks sit at <strong>0.45</strong> (deep cyan), <strong>1.05</strong> (ember) and <strong>1.35</strong> (jade).</p>
      <p>Theme&nbsp;3 washes out across every hue &mdash; its lightness scale of <code>1.20</code> blows the pastel.</p>
    </div>
    <div class="finding">
      <span class="tag">Solved</span>
      <h3>The mon axis was saturated &mdash; until the interior flattened</h3>
      <p>On <code>3.frag</code> all eleven motifs were near&#8209;indistinguishable, and the honest read was that recognition is a design problem rather than a knob. That was right: no amount of pitch or framing fixed it.</p>
      <p>The design change was figure/ground, and it worked. Worth keeping the shape of the mistake though &mdash; three sessions were spent tuning size and framing when the blocker was <em>contrast inside the silhouette</em>.</p>
    </div>
    <div class="finding">
      <span class="tag">Negative result</span>
      <h3>Seed pitch is a dead lever</h3>
      <p><code>knob_169</code> swept 0.10&nbsp;&rarr;&nbsp;0.55 against <code>knob_168</code> at 0.55/0.9/1.0 gave fifteen near&#8209;identical tiles.</p>
      <p>The cause, found afterwards: that sweep omitted <code>navZoom</code> and dropped <code>lattice-nav</code>, pinning the framing. <strong><code>navZoom</code> is the framing lever</strong>; <code>knob_169</code> only sets pitch <em>within</em> a framing.</p>
    </div>
  </div>

  <h2>No shudder</h2>
  <p class="sec-note">Measured on live audio &mdash; 1289 frames of the running set, not a synthetic bench.</p>
  <div class="tblwrap">
    <table>
      <caption>Per&#8209;frame jitter of each candidate drive signal, and the resulting frame luminance.</caption>
      <thead><tr><th>Drive signal</th><th>Jitter / frame</th><th>Range</th></tr></thead>
      <tbody>
        <tr><td><code>energyZScore</code> &mdash; the shutter</td><td class="num">0.0514</td><td class="num">&minus;0.79 &rarr; 1.18</td></tr>
        <tr><td><code>energySpring</code> &mdash; smooth, but ~1s late</td><td class="num">0.0320</td><td class="num">&mdash;</td></tr>
        <tr class="best"><td><code>onsetEnvelope</code> &mdash; <span class="win">in use</span></td><td class="num win">0.0076</td><td class="num">0 &rarr; 0.481</td></tr>
        <tr><td>Frame luminance (0&ndash;255)</td><td class="num">0.63</td><td class="num">74.1 &rarr; 92.8</td></tr>
      </tbody>
    </table>
  </div>
  <p class="sec-note" style="margin-top:14px">The flare is <strong>6.8&times; smoother</strong> than the z&#8209;score it replaced, and whole&#8209;frame luminance never strobes. Tempo lock moved from <code>beat</code> at 280&nbsp;BPM to <strong>125.3&nbsp;BPM</strong> &mdash; the set&rsquo;s actual tempo &mdash; with a 3% gap spread.</p>

  <footer>
    Links point at the <code>lab/substrate2</code> preview deploy; give Cloudflare a minute if a tile 404s. For the local rig, swap the host for <code>localhost:6994</code>.
  </footer>
</div>
"""

head = HEAD.replace("MON_HERE", "\n".join(moncard(m) for m in mons))
page = head + "\n".join(card(t) for t in tiles) + TAIL
io.open(OUT, "w", encoding="utf-8").write(page)
print("wrote", OUT, len(page) // 1024, "KB")
