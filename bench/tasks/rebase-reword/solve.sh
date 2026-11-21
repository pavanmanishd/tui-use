#!/bin/bash
set -euo pipefail
cd /home/agent/work/webapp
tui-use start "GIT_EDITOR=vim git rebase -i HEAD~3" --name rb --until-text "Add logout button" >/dev/null
tui-use send rb --input ":1s/^pick/reword/" enter ":wq" enter --until-text "Please enter the commit message" >/dev/null
tui-use send rb --input ":1s/lgoin/login/" enter ":wq" enter --until-exit >/dev/null
