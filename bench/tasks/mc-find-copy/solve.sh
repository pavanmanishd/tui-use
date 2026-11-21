#!/bin/bash
set -euo pipefail
tui-use start "mc /home/agent/work/archive/2024/q3/invoices /home/agent/work/outbox" --name mc --until-text 10Quit --timeout 10000 >/dev/null
tui-use send mc --input ctrl+s "invoice-7731" >/dev/null
tui-use snapshot mc | grep -qE '«[^»]*invoice-7731\.pdf[^»]*»'
tui-use send mc --key f5 --until-text "to:" --timeout 5000 >/dev/null
tui-use send mc --key enter --until-gone "to:" --timeout 5000 >/dev/null
tui-use send mc --key f10 --until-exit --timeout 5000 >/dev/null
