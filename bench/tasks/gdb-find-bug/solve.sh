#!/bin/bash
set -euo pipefail
cd /home/agent/work
tui-use start "gdb -q ./hist" --name gdb --until-text "(gdb)" --timeout 30000 >/dev/null
tui-use send gdb --text run --key enter --until-text "SIGSEGV" --timeout 30000 >/dev/null
tui-use send gdb --text "print acc" --key enter --until-regex '\$1 = [0-9]+' >/dev/null
tui-use snapshot gdb | grep -oE '\$1 = [0-9]+' | head -n1 | cut -d' ' -f3 > /home/agent/work/acc.txt
tui-use send gdb --text quit --key enter --until-text "Quit anyway?" >/dev/null
tui-use send gdb --text y --key enter --until-exit --timeout 10000 >/dev/null
