# Chromadepth Stats Graph

Scrolling line graph of audio statistics, colored for chromadepth 3D glasses.

- Red lines appear **closest**, blue lines appear **farthest**
- Load with `?shader=wip/claude/chromadepth-stats`

## Lines

| Depth | Color | Uniform | Shows |
|-------|-------|---------|-------|
| Closest | Red | `energyZScore` | Loudness anomalies |
| | Red-orange | `bassZScore` | Bass anomalies |
| | Orange | `trebleZScore` | Treble anomalies |
| | Yellow | `spectralFluxZScore` | Timbral change rate |
| | Chartreuse | `spectralCentroidZScore` | Brightness/pitch center |
| | Green | `spectralEntropyZScore` | Chaos/unpredictability |
| Mid | Spring green | `energySlope` | Energy rising or falling? |
| | Mint | `bassSlope` | Bass rising or falling? |
| | Cyan | `spectralCentroidSlope` | Brightness trending? |
| | Sky blue | `spectralFluxSlope` | Flux trending? |
| Far | Blue | `energyRSquared` | Energy trend confidence |
| Farthest | Violet | `bassRSquared` | Bass trend confidence |

## Effects

- **Drop detection** — when 3+ z-scores exceed threshold, background flashes red (pops forward through glasses)
- **Beat flash** — red tint burst on beat detection
- **Glow** — each line has a soft glow halo for enhanced depth separation
- **Grid** — dim reference lines at 0, +/-0.5, and +/-1.0 z-score levels

## Tuning

- `SCALE` (default 0.22) — vertical spread of lines
- `SLOPE_SCALE` (default 500) — multiplier for slope values (slopes are tiny raw numbers)
- `LINE_WIDTH` / `GLOW_SIZE` — line thickness and glow radius
- `DROP_THRESHOLD` / `DROP_MIN_COUNT` — sensitivity of drop detection
