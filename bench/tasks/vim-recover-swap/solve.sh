#!/bin/bash
set -euo pipefail
cd /home/agent/work
tui-use start "vim -r todo.md" --name ed --until-text "Recovery completed" >/dev/null
tui-use send ed --input enter ":wq" enter --until-exit >/dev/null
tui-use start "vim todo.md" --name ed2 --until-text "(D)elete it" >/dev/null
tui-use send ed2 --input d --until-regex '"todo.md" [0-9]+L' >/dev/null
tui-use send ed2 --input ":q" enter --until-exit >/dev/null
