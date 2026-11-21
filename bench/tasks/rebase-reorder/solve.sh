#!/bin/bash
set -euo pipefail
cd /home/agent/work/cli-tool
tui-use start "GIT_EDITOR=vim git rebase -i HEAD~3" --name rb --until-text "Fix typo in config loader" >/dev/null
tui-use send rb --input ":3m1" enter ":wq" enter --until-exit >/dev/null
