#!/bin/bash
set -euo pipefail
cd /home/agent/work/search-app
tui-use start "GIT_EDITOR=vim git rebase -i HEAD~3" --name rb --until-text "Add search tests" >/dev/null
tui-use send rb --input ":2,3s/^pick/squash/" enter ":wq" enter --until-text "This is a combination of 3 commits" >/dev/null
tui-use send rb --input ggdG "iAdd user search" esc ":wq" enter --until-exit >/dev/null
