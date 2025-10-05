#!/bin/bash
# Screenshot capture script for harmonic-field shader

ITERATION=$1
TIMESTAMP=$(date +%s)
FILENAME="harmonic-v${ITERATION}-${TIMESTAMP}.png"
OUTPUT_PATH="/Users/hypnodroid/Projects/paper-cranes/scripts/harmonic-screenshots/${FILENAME}"

npx playwright screenshot \
  --browser chromium \
  --viewport-size 1920,1080 \
  "http://localhost:6970/?shader=graph/harmonic-field&noaudio=true" \
  "$OUTPUT_PATH"

echo "$OUTPUT_PATH"
