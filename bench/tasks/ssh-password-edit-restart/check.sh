#!/bin/bash
set -euo pipefail
[ "$(cat /home/ops/app/app.conf)" = "$(printf '# payments-api\nlisten = 0.0.0.0:8080\nworkers = 6\nlog_level = info')" ]
[ "$(tail -n 1 /home/ops/app/restarts.log)" = "restart user=ops workers=6 ssh=yes" ]
