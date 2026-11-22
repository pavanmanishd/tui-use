#!/bin/bash
set -euo pipefail
cd /home/agent/work
value() { tui-use snapshot gdb --styles none | grep -oE "\\\$$1 = [0-9]+" | tail -n1 | cut -d' ' -f3; }
tui-use start "gdb -q ./vault" --name gdb --until-text "(gdb)" --timeout 30000 >/dev/null
tui-use send gdb --text "break mix" --key enter --until-text "Breakpoint 1" >/dev/null
tui-use send gdb --text "break finalize" --key enter --until-text "Breakpoint 2" >/dev/null
tui-use send gdb --text run --key enter --until-text "word 1 of 3:" --timeout 30000 >/dev/null
tui-use send gdb --text amber --key enter --until-regex 'Breakpoint 1, mix' --timeout 10000 >/dev/null
tui-use send gdb --text "print v->h" --key enter --until-regex '\$1 = [0-9]+' >/dev/null
seed=$(value 1)
tui-use send gdb --text continue --key enter --until-text "word 2 of 3:" >/dev/null
tui-use send gdb --text basalt --key enter --until-regex 'Breakpoint 1, mix.*basalt' >/dev/null
tui-use send gdb --text continue --key enter --until-text "word 3 of 3:" >/dev/null
tui-use send gdb --text cobalt --key enter --until-regex 'Breakpoint 1, mix.*cobalt' >/dev/null
tui-use send gdb --text continue --key enter --until-regex 'Breakpoint 2, finalize' >/dev/null
tui-use send gdb --text "print v->h" --key enter --until-regex '\$2 = [0-9]+' >/dev/null
final=$(value 2)
printf '%s\n%s\n' "$seed" "$final" > answer.txt
tui-use send gdb --text continue --key enter --until-text "exited normally" --timeout 10000 >/dev/null
tui-use send gdb --text quit --key enter --until-exit --timeout 10000 >/dev/null
