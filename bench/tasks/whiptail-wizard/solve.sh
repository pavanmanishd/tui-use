#!/bin/bash
set -euo pipefail
screen() { tui-use snapshot wiz --styles none; }
tui-use start "sudo -u wizard /usr/local/bin/cluster-wizard" --name wiz --until-text "Step 1 of 5" --timeout 10000 >/dev/null
rows=$(screen | grep -oE '[a-z]+-[a-z]+-[0-9] +(primary|standby)')
pos=$(grep -n primary <<<"$rows" | cut -d: -f1)
downs=()
for ((i = 1; i < pos; i++)); do downs+=(down); done
tui-use send wiz --input "${downs[@]}" enter --until-text "Step 2 of 5" >/dev/null
tui-use send wiz --input end $(printf 'backspace %.0s' {1..20}) orion-blue enter --until-text "Step 3 of 5" >/dev/null
tui-use send wiz --input down space tab enter --until-text "Step 4 of 5" >/dev/null
for addon in metrics logging backups autoscaler ingress; do
  line=$(screen | grep -oE "\[[ *]\] $addon")
  want=$([[ $addon == metrics || $addon == backups ]] && echo '*' || echo ' ')
  [ "${line:1:1}" = "$want" ] || tui-use send wiz --key space >/dev/null
  tui-use send wiz --key down >/dev/null
done
tui-use send wiz --input tab enter --until-text "Step 5 of 5" >/dev/null
tui-use send wiz --key enter --until-exit --timeout 5000 >/dev/null
