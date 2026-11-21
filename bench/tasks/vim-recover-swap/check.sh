#!/bin/bash
set -euo pipefail
cd /home/agent/work
expected=$(printf '# Release checklist\n- [x] bump version\n- [x] update changelog\n- [ ] tag release\n- [ ] publish packages to the internal mirror\n- [ ] announce in #releases')
[ "$(cat todo.md)" = "$expected" ]
! compgen -G '.todo.md.sw?' >/dev/null
