#!/bin/zsh
set -euo pipefail

export PATH="$HOME/.local/bin:$PATH"

echo "Starting GitHub CLI auth for BlackLedger Omega..."
echo ""
printf 'Y\n' | gh auth login --hostname github.com --git-protocol https --web --skip-ssh-key --insecure-storage
echo ""
echo "GitHub auth complete. You can return to Codex now."
