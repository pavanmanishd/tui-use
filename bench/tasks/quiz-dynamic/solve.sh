#!/bin/bash
set -euo pipefail
tui-use start "sudo -u quiz /usr/local/bin/quiz" --name quiz --until-text "Question 1 of 5" --timeout 10000 >/dev/null
for i in 1 2 3 4 5; do
  q=$(tui-use snapshot quiz --styles none | grep -oE "Question $i of 5: what is [0-9]+ [-+*] [0-9]+" | tail -n1)
  read -r a op b <<<"${q##*what is }"
  if [ "$i" -lt 5 ]; then wait=(--until-text "Question $((i + 1)) of 5"); else wait=(--until-exit); fi
  tui-use send quiz --text="$((a $op b))" --key enter "${wait[@]}" --timeout 10000 >/dev/null
done
