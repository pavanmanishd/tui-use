#!/bin/bash
set -euo pipefail
cd /home/agent/work
line=$(grep -n 'fingerprint = hashlib' keygen.py | cut -d: -f1)
tui-use start "python3 -m pdb keygen.py" --name pdb --until-text "(Pdb)" --timeout 30000 >/dev/null
tui-use send pdb --text "break $line" --key enter --until-text "Breakpoint 1" >/dev/null
tui-use send pdb --text continue --key enter --until-text "derive()" >/dev/null
tui-use send pdb --text "p session_key" --key enter --until-regex "'[0-9a-f]{8}(-[0-9a-f]{8}){3}'" >/dev/null
tui-use snapshot pdb | grep -oE "'[0-9a-f]{8}(-[0-9a-f]{8}){3}'" | head -n1 | tr -d "'" > session_key.txt
tui-use send pdb --text quit --key enter --until-exit --timeout 10000 >/dev/null
