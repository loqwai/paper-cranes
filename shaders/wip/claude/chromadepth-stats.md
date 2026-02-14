# Chromadepth Stats Graph

Scrolling line graph of audio statistics, colored for chromadepth 3D glasses.

- Red lines appear **closest**, blue lines appear **farthest**
- Load with `?shader=wip/claude/chromadepth-stats`

## Lines

### Z-Scores (warm colors — pop forward)

- **Red** — `energyZScore` — overall loudness anomalies
- **Red-orange** — `bassZScore` — low-end anomalies
- **Orange** — `trebleZScore` — high frequency anomalies
- **Yellow** — `spectralFluxZScore` — timbral change rate
- **Chartreuse** — `spectralCentroidZScore` — brightness/pitch center
- **Green** — `spectralEntropyZScore` — chaos/unpredictability

### Slopes (mid colors — mid-depth)

- **Spring green** — `energySlope` — is energy rising or falling?
- **Mint** — `bassSlope` — is bass rising or falling?
- **Cyan** — `spectralCentroidSlope` — is brightness trending?
- **Sky blue** — `spectralFluxSlope` — is flux trending?

### R-Squared (cool colors — recede back)

- **Blue** — `energyRSquared` — how steady is the energy trend?
- **Violet** — `bassRSquared` — how steady is the bass trend?

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
