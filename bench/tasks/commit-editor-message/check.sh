#!/bin/bash
set -euo pipefail
g() { git --no-optional-locks -C /home/agent/work/api-client -c safe.directory='*' "$@"; }
[ "$(g symbolic-ref HEAD)" = refs/heads/main ]
[ "$(g rev-list --count main)" = 2 ]
[ "$(g rev-parse main~1)" = "$(cat /root/.bench/commit-editor-message.base)" ]
[ "$(g rev-parse 'main^{tree}')" = "$(cat /root/.bench/commit-editor-message.tree)" ]
[ -z "$(g status --porcelain --untracked-files=no)" ]
expected=$(printf 'Add rate limiter to API client\n\nRequests are now limited to 10 per second per host.\nThe limit can be changed with the RATE_LIMIT_RPS variable.')
[ "$(g log -1 --format=%B main)" = "$expected" ]
