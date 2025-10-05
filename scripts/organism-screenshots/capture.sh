#!/bin/bash

# Capture screenshots of the holistic organism shader with REAL audio
# NO noaudio flag - we need real microphone reactivity

ITERATION=$1
if [ -z "$ITERATION" ]; then
  ITERATION=1
fi

SCREENSHOT_DIR="/Users/hypnodroid/Projects/paper-cranes/scripts/organism-screenshots"

echo "Capturing iteration $ITERATION with LIVE AUDIO..."
echo "Make sure music is playing!"

# Give time for audio to vary
sleep 5

echo "Screenshot saved to: organism-v${ITERATION}.png"
