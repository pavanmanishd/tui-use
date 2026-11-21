#!/bin/bash
set -euo pipefail
export OPS_PASSWORD='Harbor-Lamp-42'
tui-use start "ssh ops@localhost" --name remote --until-regex 'yes/no|password:' --timeout 10000 >/dev/null
if tui-use snapshot remote | grep -q 'yes/no'; then
  tui-use send remote --text yes --key enter --until-text "password:" --timeout 5000 >/dev/null
fi
tui-use send remote --secret-env OPS_PASSWORD --key enter --until-regex 'ops@[^:]*:~\$' --timeout 10000 >/dev/null
tui-use send remote --input "vim app/app.conf" enter --until-text "app.conf\"" --timeout 5000 >/dev/null
tui-use send remote --input ":%s/^workers = 2$/workers = 6/" enter ":wq" enter >/dev/null
tui-use send remote --input "~/bin/restart-app" enter --until-text "restarted with" --timeout 5000 >/dev/null
tui-use send remote --input exit enter --until-exit --timeout 5000 >/dev/null
