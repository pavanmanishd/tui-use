#!/bin/bash
set -euo pipefail
g() { git --no-optional-locks -C /home/agent/work/shop -c safe.directory='*' "$@"; }
[ "$(g symbolic-ref HEAD)" = refs/heads/main ]
[ "$(g rev-list --count main)" = 2 ]
[ "$(g rev-parse main~1)" = "$(cat /root/.bench/add-p-one-hunk.base)" ]
[ "$(g log -1 --format=%B main)" = "Fix off-by-one in paginate" ]
[ "$(g rev-parse main:pagination.py)" = "$(cat /root/.bench/add-p-one-hunk.fixed)" ]
[ "$(g ls-tree --name-only main)" = pagination.py ]
g diff --cached --quiet
[ "$(g status --porcelain --untracked-files=no)" = " M pagination.py" ]
[ "$(g hash-object /home/agent/work/shop/pagination.py)" = "$(cat /root/.bench/add-p-one-hunk.worktree)" ]
