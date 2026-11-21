#!/bin/bash
set -euo pipefail
running() { pgrep -u agent -f "^$1 infinity\$" >/dev/null; }
if running ledger-sync-daemon; then exit 1; fi
for name in ledger-sync-agent ledger-sync-worker ledger-cache; do
  running "$name"
done
