# sun-lattice — Session Journal

## Status
2026-11-14 dry run: unattended /vibej2 on the Windows Surface, internal mic (audio_gain=16) hearing
the Echo Studio playing the user's Spotify queue. Scratch target `claude/wip/sun-lattice/1-wip`.

## Cool moments
- **Beat 3, ~evoPhase 0.5** — audio: Vini Vici psytrance, energy 0.059, gate 0.87. The widened burn (slb3) made one lattice cell glow gold at the heart with warm spill into neighbouring cells; reads as a sun burning IN the lattice, not a sticker. Health: clip 0, lum 0.23, hueDrift 0.003/min. Hypothesis: the sun works best when it lights a cell interior, so a future version could snap the sun centre to the nearest cell centre.

## Todo
- [ ] watch hueConc: 0.83 at beat 3 (monochrome-blue field); prefs flag > 0.85

## History of changes
- slb3 (beat 3): heat falloff 1.6 -> 0.9 so the burn reaches the surrounding lattice.
- Input: audio_gain 16 -> 32 live (quietGate needs energy 0.065 to open fully; x16 gave gate ~0.3).
- slb1 (beat 1): sun start radius 0.12 -> 0.22; a 0.12 sun read as a speck from across the room.

## Forks
- `sun-lattice/1 <- redaphid/wip/lattice-vj/9` (2026-11-14): fusion with the sun set.

## Design hypotheses for v(next)
