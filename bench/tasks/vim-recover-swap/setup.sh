#!/bin/bash
set -euo pipefail
cd /home/agent/work
printf '# Release checklist\n- [ ] bump version\n- [ ] update changelog\n- [ ] tag release\n' > todo.md
chown -R agent:agent /home/agent/work
touch -d '2024-01-01 10:00:00' todo.md
printf '%s\n' \
  '2s/\[ \]/[x]/' \
  '3s/\[ \]/[x]/' \
  '$a' \
  '- [ ] publish packages to the internal mirror' \
  '- [ ] announce in #releases' \
  '.' \
  'preserve' \
  'call system("kill -9 " . getpid())' > /tmp/crash.vim
(sudo -u agent vim -E -s -u NONE -i NONE todo.md < /tmp/crash.vim || true) >/dev/null 2>&1
rm -f /tmp/crash.vim
[ -f .todo.md.swp ]
chown -R agent:agent /home/agent/work
