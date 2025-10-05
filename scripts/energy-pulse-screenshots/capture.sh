#!/bin/bash

VERSION=${1:-v15}
URL="http://localhost:6969/?shader=graph/energy-pulse&noaudio=true"
OUTPUT="/Users/hypnodroid/Projects/paper-cranes/.playwright-mcp/energy-pulse-${VERSION}.png"

# Use playwright with wait-for-selector to ensure canvas is ready
npx -y playwright screenshot "$URL" "$OUTPUT" \
  --wait-for-timeout 3000 \
  --full-page

echo "Screenshot saved to $OUTPUT"
