#!/bin/bash
# package-extension.sh — Creates a clean ZIP for Chrome Web Store submission

EXTENSION_NAME="chrome-tab-screenshot"
VERSION=$(node -e "console.log(require('./manifest.json').version)")
OUTPUT="${EXTENSION_NAME}-v${VERSION}.zip"

# Remove old package if exists
rm -f "$OUTPUT"

echo "Packaging version $VERSION..."

# Create ZIP excluding development and store listing files
zip -r "$OUTPUT" . \
  -x ".git/*" \
  -x "node_modules/*" \
  -x ".env" \
  -x "*.map" \
  -x "CHROMEWEBSTORE.md" \
  -x "README.md" \
  -x "LICENSE" \
  -x "AGENTS.md" \
  -x ".DS_Store" \
  -x "Thumbs.db" \
  -x "*.sh" \
  -x "screenshots/*"

echo "Packaged: $OUTPUT ($(du -h "$OUTPUT" | cut -f1))"
