#!/bin/bash
set -euo pipefail
export OPS_PASSWORD='Copper-Field-17'
tui-use start "ssh ops@localhost" --name remote --until-text 'yes/no' --timeout 10000 >/dev/null
tui-use send remote --text yes --key enter --until-text "password:" --timeout 5000 >/dev/null
tui-use send remote --secret-env OPS_PASSWORD --key enter --until-regex 'ops@[^:]*:~\$' --timeout 10000 >/dev/null
tui-use send remote --input "echo 'hostkey ok' > /home/ops/hello.txt" enter >/dev/null
tui-use send remote --input exit enter --until-exit --timeout 5000 >/dev/null
