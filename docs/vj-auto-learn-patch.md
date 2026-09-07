# Auto-LEARN — permanent patch for `src/vj/runtime.js` §7b

**Status: PREPARED, NOT APPLIED.** Applying this edits a file the display page fetches, which
triggers HMR and can reload the page — a reload resets `evoPhase` to 0 and destroys an accrued
flow state (measured cost on 2026-08-20: a 16.6 set clock, 99.6% complexity → 5%). **Apply this
BETWEEN SETS only.** Until then the same code is injected into the running page by hand (see
"Live injection" below), which needs no reload.

## Why

The LEARN button freezes a gesture window (runtime.js §7b), but until 2026-08-20 the *analysis*
happened in the VJ loop's context. A Monitor notification only reaches the loop between turns, so
a press could wait minutes while the loop was mid-edit. Measured that day: **~3 minutes** on a
press the user was actively waiting for.

Moving the analysis into the page removes the loop from the latency path entirely.
**Measured after: 56 ms** from WS delivery to the answer being posted, worst case ~450 ms (bounded
by the 250 ms confirm watcher plus the 200 ms analysis poller). The loop's only remaining LEARN job
is deciding whether to *wire* a finding.

## The patch

Insert at the end of §7b in `src/vj/runtime.js`, immediately after the `setInterval` that sets
`window.__vjLearnWindow`:

```js
  // 7c. AUTO-ANSWER the LEARN press, in-page (2026-08-20). The loop cannot be in this path: a
  //     Monitor notification only reaches it between turns, so a press waited ~3 minutes once.
  //     Here the page analyses its own frozen window and answers the pad over the hub directly.
  //     Cost is one correlation pass per PRESS (not per frame), so it is show-safe.
  {
    const shortFeat = f => f
      .replace(/^spectral/, '').replace(/^wavelet_?/, 'w')
      .replace(/Normalized$/, ' N').replace(/ZScore$/, ' Z').replace(/Smooth$/, ' sm').replace(/Spring$/, ' spr')
      .replace(/^(.)/, m => m.toLowerCase())
    const wsSend = (type, data) => {
      try {
        const s = window.cranes?.remoteClient?.socket
        if (s && s.readyState === 1) { s.send(JSON.stringify({ type, data })); return true }
      } catch (e) {}
      return false
    }
    let answered = 0
    setInterval(async () => {
      const w = window.__vjLearnWindow
      if (!w || w.confirmedAt === answered) return
      answered = w.confirmedAt
      // the analyser is fetched on demand, exactly like the aesthetic meter
      if (typeof window.__vjLearn !== 'function') {
        try { eval(await fetch('/scripts/vj/learn-correlate.js?t=' + Date.now()).then(r => r.text())) }
        catch (e) { post({ type: 'error', what: 'learn-install', info: String(e) }); return }
      }
      let line
      try {
        const res = window.__vjLearn(w.samples)
        if (!res.ok) line = 'LEARN: ' + res.why + ' — move a fader, then press'
        else if (!res.knobs.length) line = `LEARN ${res.secs}s · no fader moved enough to read`
        else line = `LEARN ${res.secs}s · ` + res.knobs.slice(0, 3).map(k => {
          const b = k.bestGuess, kn = k.knob.replace('knob_', 'K')
          return b ? `${kn}→${shortFeat(b.feature)} ${b.r > 0 ? '+' : ''}${b.r} ${b.confidence}${k.timeTrendSuspect ? '⚠trend' : ''}` : `${kn} ?`
        }).join(' · ')
      } catch (e) { line = 'LEARN: analysis error ' + e.message }
      wsSend('vj-status', { kind: 'learn-result', id: 'auto-learn', severity: 'ok', text: line })
      post({ type: 'learn-answered', t: new Date().toISOString(), text: line })
    }, 200)
  }
```

## Live injection (no reload — what is running now)

Same body, pasted through `javascript_tool` on the display tab, guarded so a re-inject replaces
the old poller instead of stacking:

```js
if (window.__vjAutoLearn) clearInterval(window.__vjAutoLearn)
window.__vjAutoLearn = setInterval(/* … same body … */, 200)
```

`window.__vjAutoLearn` holding a numeric interval id is the tell that the live version is armed.
The permanent patch does not need that global, but keeping it makes the two versions
distinguishable during a hand-off.

## Verified behaviour (2026-08-20, live mic set)

| Check | Result |
|---|---|
| Latency, WS delivery → answer posted | **56 ms** |
| Worst case (two pollers: 250 ms + 200 ms) | ~450 ms |
| Real press with gesture data | `LEARN 17.6s · K148→wBand1 -0.472 strong · K147→melodyFlow +0.596 weak` |
| Press with an idle ring | `LEARN: only 0 samples — nothing moved at all — move a fader, then press` |
| Verdict length | ~80–100 chars, fits the pad's loop strip |

## Notes

- The ring is **gesture-gated** (samples only while a knob moved in the last 3 s), so a press after
  a long idle stretch legitimately returns zero samples. That is not a failure; the message says so.
- Verdicts also land in `.claude/vj-signals.jsonl` as `learn-answered`, so the loop can read what
  the page already told the user without re-running the analysis.
- Feature names are shortened for the phone (`spectralFluxNormalized` → `flux N`); the full name
  stays in the signal file.
