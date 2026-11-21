#!/bin/bash
set -euo pipefail
cd /home/agent/work/billing
tui-use start "tig blame app/settings.py" --name tg --until-text MAX_RETRIES >/dev/null
tui-use send tg --input "/MAX_RETRIES = 7" enter >/dev/null
tui-use send tg --key enter --until-regex 'commit [0-9a-f]{40}' --timeout 5000 >/dev/null
hash=$(tui-use snapshot tg --styles none | grep -oE 'commit [0-9a-f]{40}' | head -1 | cut -d' ' -f2)
tui-use send tg --input q q --until-exit --timeout 5000 >/dev/null
echo "$hash" > /home/agent/work/answer.txt
