#!/bin/bash
set -euo pipefail
mkdir -p /home/agent/work/billing/app
cd /home/agent/work/billing
git init -q
day=1
commit() {
  export GIT_AUTHOR_DATE="2024-03-$(printf %02d "$day")T09:30:00Z" GIT_COMMITTER_DATE="2024-03-$(printf %02d "$day")T09:30:00Z"
  git add -A
  git commit -qm "$1"
  day=$((day + 1))
}
setting() { sed -i "s/^$1 = .*/$1 = $2/" app/settings.py; }
cat > app/settings.py <<'PY'
DEBUG = False
TIMEOUT_SECONDS = 10
MAX_RETRIES = 3
BACKOFF_MS = 200
CURRENCY = "EUR"
BATCH_SIZE = 50
PY
printf 'def charge(amount):\n    return amount\n' > app/gateway.py
printf '# billing\n' > README.md
commit "Initial commit"
printf 'def refund(amount):\n    return -amount\n' > app/refunds.py; commit "Add refunds"
setting TIMEOUT_SECONDS 15; commit "Increase gateway timeout"
printf '\nSee app/settings.py for tuning.\n' >> README.md; commit "Document settings"
setting MAX_RETRIES 5; commit "Retry failed charges"
setting BACKOFF_MS 250; commit "Slow down retry backoff"
printf 'def charge(amount, currency="EUR"):\n    return amount\n' > app/gateway.py; commit "Pass currency to the gateway"
setting BATCH_SIZE 100; commit "Bigger settlement batches"
setting MAX_RETRIES 7; commit "Tolerate flaky gateway responses"
setting BACKOFF_MS 400; commit "Back off longer between retries"
setting TIMEOUT_SECONDS 20; commit "Raise timeout for slow banks"
printf 'def void(charge_id):\n    return charge_id\n' > app/voids.py; commit "Add voids"
setting BATCH_SIZE 80; commit "Smaller settlement batches"
setting DEBUG True; commit "Enable debug logging"
setting DEBUG False; commit "Disable debug logging again"
printf '\nRetries are capped in settings.\n' >> README.md; commit "Mention the retry cap"
chown -R agent:agent /home/agent/work
