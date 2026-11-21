#!/bin/bash
set -euo pipefail
# Sorting by PID keeps the tui-use processes, whose arguments also contain the name, below the target.
tui-use start "htop --sort-key PID" --name top --until-text F10 >/dev/null
tui-use send top --input f3 "ledger-sync-daemon" enter --until-idle 300 --timeout 3000 >/dev/null
tui-use snapshot top | grep -q '«.*ledger-sync-daemon infinity'
tui-use send top --key f9 --until-text SIGTERM --timeout 3000 >/dev/null
tui-use send top --key enter --until-idle 300 --timeout 3000 >/dev/null
tui-use send top --key f10 --until-exit --timeout 3000 >/dev/null
