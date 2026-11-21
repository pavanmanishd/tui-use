#!/bin/bash
set -euo pipefail
g() { git --no-optional-locks -C /home/agent/work/cli-tool -c safe.directory='*' "$@"; }
{ read -r tip_tree; read -r loader_tree; read -r base; read -r old_readme; read -r fixed_config; } < /root/.bench/rebase-reorder
gd=$(g rev-parse --absolute-git-dir)
[ ! -e "$gd/rebase-merge" ]
[ ! -e "$gd/rebase-apply" ]
[ "$(g symbolic-ref HEAD)" = refs/heads/main ]
[ -z "$(g status --porcelain --untracked-files=no)" ]
[ "$(g log --reverse --format=%s main)" = "$(printf 'Initial commit\nAdd config loader\nFix typo in config loader\nAdd README usage section')" ]
[ "$(g rev-parse main~3)" = "$base" ]
[ "$(g rev-parse 'main~2^{tree}')" = "$loader_tree" ]
[ "$(g rev-parse main~1:README.md)" = "$old_readme" ]
[ "$(g rev-parse main~1:config.py)" = "$fixed_config" ]
[ "$(g rev-parse 'main^{tree}')" = "$tip_tree" ]
