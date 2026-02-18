#!/bin/bash
# Capture before/after screenshots for release notes
# Usage: ./scripts/capture-release-screenshots.sh "0.2.0" "Auto-Naming Threads"

set -e

VERSION="${1:-0.2.0}"
FEATURE_NAME="${2:-Feature}"
SCREENSHOTS_DIR="docs/releases/${VERSION}"

mkdir -p "$SCREENSHOTS_DIR"

echo "📸 Release screenshot capture for v${VERSION}: ${FEATURE_NAME}"
echo ""
echo "This script helps document before/after visuals for release notes."
echo ""
echo "Instructions:"
echo "1. Start the dev app: npm run tauri dev"
echo "2. Position the window clearly (avoid shadows/overlays)"
echo "3. Press ENTER when ready to capture BEFORE screenshot"
echo "4. Perform the feature action (e.g., click '+' for new thread)"
echo "5. Press ENTER to capture AFTER screenshot"
echo "6. Screenshots saved to: $SCREENSHOTS_DIR"
echo ""

read -p "Press ENTER to start (make sure app is running in a clean state)..."

# macOS screenshot command
if command -v screencapture &> /dev/null; then
    echo "Capturing BEFORE screenshot..."
    screencapture -x "$SCREENSHOTS_DIR/before.png"
    echo "✓ Saved: $SCREENSHOTS_DIR/before.png"
    echo ""

    read -p "Perform the feature action, then press ENTER to capture AFTER..."

    sleep 1
    echo "Capturing AFTER screenshot..."
    screencapture -x "$SCREENSHOTS_DIR/after.png"
    echo "✓ Saved: $SCREENSHOTS_DIR/after.png"
    echo ""
    echo "Screenshots ready for release notes!"
    echo "Add to CHANGELOG.md:"
    echo ""
    echo "**Before:**"
    echo "![Before](docs/releases/${VERSION}/before.png)"
    echo ""
    echo "**After:**"
    echo "![After](docs/releases/${VERSION}/after.png)"
else
    echo "❌ screencapture not found (macOS only)"
    exit 1
fi
