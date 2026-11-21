#!/bin/bash
set -euo pipefail
cd /home/agent/work
tui-use start "vim upstreams.conf" --name ed --until-text upstreams.conf >/dev/null
tui-use send ed --input ":/^# BEGIN legacy/,/^# END legacy/d" enter ":wq" enter --until-exit >/dev/null
