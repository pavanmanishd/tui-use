#!/bin/bash
set -euo pipefail
selected() { tui-use snapshot du | grep -qE "«[^»]*$1[^»]*»"; }
tui-use start "ncdu /home/agent/work/data" --name du --until-text "Total disk usage" --timeout 15000 >/dev/null
selected "/backups" || tui-use send du --key down >/dev/null
selected "/backups"
tui-use send du --key d --until-text "Confirm delete" --timeout 5000 >/dev/null
tui-use send du --key left >/dev/null
selected "yes"
tui-use send du --key enter --until-gone "Confirm delete" --timeout 5000 >/dev/null
tui-use send du --key q --until-exit --timeout 5000 >/dev/null
