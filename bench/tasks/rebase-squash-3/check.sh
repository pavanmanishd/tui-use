#!/bin/bash
set -euo pipefail
g() { git --no-optional-locks -C /home/agent/work/search-app -c safe.directory='*' "$@"; }
gd=$(g rev-parse --absolute-git-dir)
[ ! -e "$gd/rebase-merge" ]
[ ! -e "$gd/rebase-apply" ]
[ "$(g symbolic-ref HEAD)" = refs/heads/main ]
[ -z "$(g status --porcelain --untracked-files=no)" ]
[ "$(g log --format=%s main)" = "$(printf 'Add user search\nAdd user model\nInitial commit')" ]
[ "$(g log -1 --format=%B main)" = "Add user search" ]
[ "$(g rev-parse 'main^{tree}')" = "$(cat /root/.bench/rebase-squash-3.tree)" ]
[ "$(g rev-parse main~1)" = "$(cat /root/.bench/rebase-squash-3.base)" ]
