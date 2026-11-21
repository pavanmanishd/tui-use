#!/bin/bash
set -euo pipefail
cd /home/agent/work/service
tui-use start "git mergetool --tool=vimdiff" --name mt --until-text "REMOTE_" >/dev/null
tui-use send mt --input "]c" ":diffget REMOTE" enter >/dev/null
tui-use send mt --input "]c" ":diffget LOCAL" enter >/dev/null
tui-use send mt --input ":wqa" enter --until-exit >/dev/null
git commit -q --no-edit
