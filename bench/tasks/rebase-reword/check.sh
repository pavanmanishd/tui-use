#!/bin/bash
set -euo pipefail
g() { git --no-optional-locks -C /home/agent/work/webapp -c safe.directory='*' "$@"; }
gd=$(g rev-parse --absolute-git-dir)
[ ! -e "$gd/rebase-merge" ]
[ ! -e "$gd/rebase-apply" ]
[ "$(g symbolic-ref HEAD)" = refs/heads/main ]
[ -z "$(g status --porcelain --untracked-files=no)" ]
[ "$(g log --format=%s main)" = "$(printf 'Add logout button\nAdd session cookie\nAdd login form\nInitial commit')" ]
[ "$(g log -1 --format=%B main~2 | grep -viE '^co-authored-by:')" = "Add login form" ]
[ "$(g log --format=%T main)" = "$(cat /root/.bench/rebase-reword.trees)" ]
[ "$(g rev-parse main~3)" = "$(cat /root/.bench/rebase-reword.base)" ]
