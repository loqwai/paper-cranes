#!/bin/bash
# Convert images in public/images/ to WebP for smaller downloads.
# Originals are kept so existing URLs still work.
# The app prefers .webp at runtime when available.

set -e

DIR="public/images"

for f in "$DIR"/*.png "$DIR"/*.jpg "$DIR"/*.jpeg; do
  [ -f "$f" ] || continue
  base="${f%.*}"
  webp="$base.webp"
  [ -f "$webp" ] && continue  # skip if already converted
  echo "Converting $f → $webp"
  cwebp -q 80 -m 6 "$f" -o "$webp" 2>/dev/null
done

for f in "$DIR"/*.gif; do
  [ -f "$f" ] || continue
  base="${f%.*}"
  webp="$base.webp"
  [ -f "$webp" ] && continue
  echo "Converting $f → $webp"
  gif2webp -q 80 "$f" -o "$webp" 2>/dev/null
done

echo "Image optimization complete."
echo "Size comparison:"
du -sh "$DIR"/*.webp 2>/dev/null | sort -rh
