#!/bin/bash
set -euo pipefail
export OPS_PASSWORD='Copper-Fern-19'
tui-use start "ssh ops@localhost" --name ops --until-regex 'yes/no|password:' --timeout 10000 >/dev/null
if tui-use snapshot ops | grep -q 'yes/no'; then
  tui-use send ops --text yes --key enter --until-text "password:" --timeout 5000 >/dev/null
fi
tui-use send ops --secret-env OPS_PASSWORD --key enter --until-text "Choose an action" --timeout 10000 >/dev/null
tui-use send ops --input down down enter --until-text "to confirm" --timeout 5000 >/dev/null
code=$(tui-use snapshot ops --styles none | grep -oE 'Type the code [0-9]{4}' | grep -oE '[0-9]{4}')
tui-use send ops --text "$code" --key enter --until-text "Cache flushed" --timeout 5000 >/dev/null
tui-use send ops --key enter --until-text "Choose an action" --timeout 5000 >/dev/null
tui-use send ops --input down down down down enter --until-exit --timeout 10000 >/dev/null
