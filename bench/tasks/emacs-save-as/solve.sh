#!/bin/bash
set -euo pipefail
cd /home/agent/work
tui-use start "emacs -nw draft.txt" --name ed --until-text "Maintenance window" >/dev/null
tui-use send ed --input ctrl+s DRAFT enter >/dev/null
tui-use send ed --input backspace backspace backspace backspace backspace APPROVED --until-text "Status: APPROVED" >/dev/null
tui-use send ed --input ctrl+x ctrl+w --until-text "Write file:" >/dev/null
tui-use send ed --input approved.txt enter --until-text "Wrote" >/dev/null
tui-use send ed --input ctrl+x ctrl+c --until-exit >/dev/null
