#!/bin/bash
set -euo pipefail
tui-use start "less /home/agent/work/logs/app.log" --name pager --until-text app.log >/dev/null
tui-use send pager --input "/ledger checksum mismatch" enter >/dev/null
id=$(tui-use snapshot pager --styles none | grep -A1 'ledger checksum mismatch' | grep -o 'request_id=req-[0-9a-f]*' | head -1 | cut -d= -f2)
tui-use send pager --key q --until-exit >/dev/null
echo "$id" > /home/agent/work/answer.txt
