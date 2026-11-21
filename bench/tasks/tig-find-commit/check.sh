#!/bin/bash
set -euo pipefail
cd /home/agent/work/billing
expected=$(git -c safe.directory='*' log --format=%H -S'MAX_RETRIES = 7' -- app/settings.py)
[ "$(wc -w <<<"$expected")" = 1 ]
[ "$(tr -d '[:space:]' < /home/agent/work/answer.txt)" = "$expected" ]
