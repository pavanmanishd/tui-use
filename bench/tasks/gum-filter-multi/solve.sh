#!/bin/bash
set -euo pipefail
cd /home/agent/work
tui-use start ./pick-packages.sh --name pkgs --until-text "Packages to install" --timeout 10000 >/dev/null
for pkg in postgresql-client redis-tools jq; do
  tui-use send pkgs --input ctrl+u "$pkg" >/dev/null
  tui-use snapshot pkgs --styles none | grep -qE "^ *[0-9]+│• ○ $pkg *\$"
  tui-use send pkgs --key tab >/dev/null
done
tui-use send pkgs --key ctrl+u >/dev/null
[ "$(tui-use snapshot pkgs --styles none | grep -c '◉')" = 3 ]
tui-use send pkgs --key enter --until-exit --timeout 5000 >/dev/null
