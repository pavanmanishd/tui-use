#!/bin/bash
set -euo pipefail
for name in ledger-sync-agent ledger-sync-daemon ledger-sync-worker ledger-cache; do
  setsid nohup setpriv --reuid agent --regid agent --init-groups bash -c "exec -a $name sleep infinity" &>/dev/null &
done
for _ in $(seq 50); do
  [ "$(pgrep -c -u agent -f '^ledger-' || true)" = 4 ] && break
  sleep 0.1
done
chown -R agent:agent /home/agent/work
