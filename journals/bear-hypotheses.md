# Bear hypotheses — live monitor (claude/wip/bear/3)

Owner: the monitor fork (read-only on the page). Started 2026-09-11 ~09:40Z.
Method: an in-page sampler (`window.__bearMon`) takes one sample every 100 ms and keeps a buffer of about 130 s. It records audio springs and z-scores, mirrors the gates defined in 3.frag, and reads canvas region metrics from a 160 px readback. The regions are interior, head (within 0.10 of the mouth), above-head exterior, amber and cyan fractions of the exterior, motion, and clip. Samples taken while `messageParams` is non-empty (someone is pinning a corner for a still) are excluded from all statistics.
Rule: a hypothesis is marked supported only with at least 3 windows of about 45 s, or a whole track.

Exclusions:
- Samples taken while location.search carries any sampled feature key (pinned for a still) or messageParams is non-empty.
- The 10 s after each sampler (re)install.
- ~~Face and model image windows void~~ RETRACTED at about 09:50Z. The user kept two versions:
  - **4.frag** is the model-image bear (image=bear-model.png, IMG_ASPECT 563/945).
  - **3.frag** is being rewritten as the photo-image face bear, "the good bear" (image=bear-face.png, IMG_ASPECT 556/945).
  Both are valid. Every sample is tagged with its shader and image, and every window below states which combo it came from so the two can be compared. Only pinned windows stay excluded.

## Hypotheses

| id | hypothesis | test | status | evidence | move if supported | rule check |
|---|---|---|---|---|---|---|

## Passage log

