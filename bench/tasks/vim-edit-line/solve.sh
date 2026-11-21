#!/bin/bash
set -euo pipefail
cd /home/agent/work
tui-use start "vim config.ini" --name ed --until-text config.ini >/dev/null
tui-use send ed --input ":%s/timeout = 30/timeout = 90/" enter ":wq" enter --until-exit >/dev/null
