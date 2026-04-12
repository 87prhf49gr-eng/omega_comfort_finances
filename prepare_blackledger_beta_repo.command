#!/bin/zsh
set -euo pipefail

SOURCE_DIR="/Users/josal/Documents/New project 5/blackledger-elite-app"
TARGET_DIR="/Users/josal/Documents/New project 5/blackledger-omega-beta-deploy"
TEMP_DIR="${TARGET_DIR}.tmp-sync"

rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

rsync -a --delete --delete-excluded \
  --exclude "node_modules" \
  --exclude "data/beta-sessions.json" \
  --exclude "data/beta-workspaces" \
  --exclude "data/waitlist-leads.json" \
  --exclude "debug_playwright.png" \
  --exclude "logo-concepts.html" \
  --exclude "logo-omega-preview.html" \
  --exclude "logo-omega-reference-preview.html" \
  --exclude "logo-omega-refined-preview.html" \
  --exclude "logo-omega-symbolic-preview.html" \
  --exclude "playwright-report" \
  --exclude "test-results" \
  --exclude "*.log" \
  --exclude ".DS_Store" \
  "$SOURCE_DIR/" "$TEMP_DIR/"

if [ -d "$TARGET_DIR/.git" ]; then
  mv "$TARGET_DIR/.git" "$TEMP_DIR/.git"
fi

rm -rf "$TARGET_DIR"
mv "$TEMP_DIR" "$TARGET_DIR"

echo ""
echo "Clean deploy folder ready:"
echo "$TARGET_DIR"
echo ""
echo "Next:"
echo "1. Create a private GitHub repo."
echo "2. Upload the contents of this folder."
echo "3. Connect that repo to Render."
