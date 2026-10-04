# Bear hypotheses — live monitor (claude/wip/bear/3 and /4)

Owner: the monitor fork (read-only on the page). Started 2026-09-11 ~09:40Z.

## Mode: ALERTS ONLY (from ~10:02Z)

User feedback via the coordinator: *"the 'dark body hypothesis' sounds like a very silly thing to be spending so much time on. I need to see you iterating like you usually do on the quality of the visual!!!"*

The in-page sampler keeps running at 10 Hz. Gate mirrors are rebuilt from the live shader's own `#define`s whenever the file changes, because the coordinator edits 4.frag every minute or two. An in-page engine evaluates a 45 s window and raises an alert only on:
1. clip > 0 across two consecutive windows;
2. flicker proxy > 0.8 across two consecutive unpinned windows, with the region driving it;
3. a shader compile error, or a black frame (mean luma under 0.004 for at least 1 s);
4. an effect made dead by a shader edit: gate duty 0 in two consecutive windows when it was live earlier, and the defines changed after the last live window.

Pinned or short windows neither raise alerts nor reset the chain. Alerts go to the coordinator in three lines, with no other messages.

## Abandoned (by user feedback, ~10:02Z)

- **H7 (H-floor / dark body)** is abandoned. Last state: over 50% of the silhouette below luma 0.05 for 56-84% of the time across 3 windows. Not pursued further.
- **R1 (relative-gate duty study)** is abandoned. Last state: candidate B, the spring minus a slow mean over a slow mean deviation, had range-normalised jitter of 1.0-1.2x a spring's and gate duty of 5-11% in one build window. Not pursued further.
- **H11 (10:00:01-07Z flicker spike slice)** is dropped because it couldn't be answered in one read. At 10:01:44Z the buffer still held that slice: 60 samples, with the earliest sample at 09:59:34Z. By the time the read executed seconds later it had aged out of the 130 s ring. My earlier message to the coordinator saying it had "already aged out" was therefore about 20 s premature. The outcome was the same: no attribution possible.

## Findings kept (from the hypothesis phase, W1-W4, bear/4 + bear-model.png)

| id | finding | status | evidence |
|---|---|---|---|
| H5b | After the GAMUT GUARD, clip is 0 and the phosphor is not washed out. | 0 clip across 4 windows (groove×3, build). Not washed. | Bright head pixels (luma > .30) have saturation p50 .84. The W3 median drop was dark pixels. |
| H8 | LIFT sharpens the print's layer lines as designed (beat 7). | **SUPPORTED** | Best r +.45 / +.70 / +.58 across groove, groove, build, measured on a native-res 64 px crop. Energy partly confounds. |
| H9 | The god rays fire when BRIGHT opens. | confirmed (1 window) | Build window: BRIGHT vs far-above-head cyan r .93. |
| H1 | The loud corners are near-dead in grooves. | open, weakening | They opened in the build: DROP max .94, BRIGHT max .32. |
| H2 | KICK never punches on this material. | open | KICK max 0 in the build, and never above .59 in 4 windows. |
| H3 | Hue leaks into brightness. | leaning refuted | The sign held 4/4 but magnitude was over .2 in only 2/4. |
| H10 | The 30-60 s flicker rise is the beam sweep cycle (0.15-0.25 Hz), not strobe. | refuted as sustained | Flicker proxy .68 / .81 / .53 / .75. |

## Passage log

- **W1** (about 09:52Z), bear/4 + model, 33 s, groove. Energy spring .20/.27/.37. Flicker .677. Clip .0026 (pre-guard). Peak 2.15 Hz.
- *(GAMUT GUARD hot-swapped into bear/4 at about 09:57Z)*
- **W2** (about 10:00Z), 60 s (about 38 s new), groove. Energy spring .17/.33/.45. Flicker .808. Clip 0. Peak 0.4 Hz.
- **W3** (about 10:01Z), 30 s, groove. Energy spring .22/.33/.50. Flicker .526. Clip 0. Peak 0.25 Hz.
- **W4** (about 10:02Z), 40 s, build (energy trend +.213). Energy spring .13/.33/.51. Flicker .747. Clip 0. DROP max .941, BRIGHT max .317, KICK 0.
- *(Alerts-only mode from about 10:02Z; alerts are logged below as they fire)*

## Alerts log

- **Engine outage, about 10:03-10:05Z.** A patch rebuilt the alert function from its source text, which stripped its access to the monitor object; every tick threw "M is not defined", so no alert could have fired in that gap. It was reinstalled with all state referenced through `window.__bearMon`. The dead-effect rule was also fixed: it had wrongly suppressed the alert when the effect was live two windows back. The self-test recorded a real window before the engine was trusted.
- **10:05:59Z** first alerts-only window (bear/4 + model): flicker .80, exactly at the bar and not over it, driven above the head. Clip 0. Live gates: MOTION .78, HAT .08, CHAOS .05. No alert.
- **10:06:44Z** (bear/4 + model; the defines had changed since install and the mirrors rebuilt cleanly): flicker .60, driven above the head. Clip 0. Live gates: MOTION .82, LIFT .22, HAT .20, LOUD .16, CHAOS .13. No alert.
- **10:07:29Z** (bear/4 + model): flicker .61, driven above the head. Clip 0. Live gates: MOTION .71, LIFT .21, HAT .20, LOUD .14, CHAOS .13, **KICK .04, ROAR .04**. This is the first KICK duty of the session; W1-W4 never saw it, so it was probably unlocked by the coordinator's define edits. No alert.
- **Monitor fork ended about 10:08Z.** The in-page engine keeps evaluating windows, but nothing delivers its alerts any more. They accumulate in `window.__bearMon.alerts`. To stop the sampler: `['timer','timer2','timerG','timerA'].forEach(k => clearInterval(window.__bearMon[k]))`.

