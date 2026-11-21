#!/bin/bash
set -euo pipefail
g() { git --no-optional-locks -C /home/agent/work/service -c safe.directory='*' "$@"; }
{ read -r main_tip; read -r feature_tip; } < /root/.bench/mergetool-resolve
gd=$(g rev-parse --absolute-git-dir)
[ ! -e "$gd/MERGE_HEAD" ]
[ "$(g symbolic-ref HEAD)" = refs/heads/main ]
[ -z "$(g status --porcelain --untracked-files=no)" ]
[ "$(g rev-parse feature)" = "$feature_tip" ]
[ "$(g log -1 --format=%P main)" = "$main_tip $feature_tip" ]
expected=$(cat <<'YML'
service:
  name: billing
  port: 8443
  workers: 4
  region: eu-west-1
  owner: payments
  tier: gold
  retries: 3
  log_level: warn
  timeout: 30
YML
)
[ "$(g show main:config.yml)" = "$expected" ]
[ "$(g ls-tree --name-only main)" = config.yml ]
