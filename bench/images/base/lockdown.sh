#!/bin/bash
set -euo pipefail
keep=" $* "
rm -f /etc/sudoers.d/agent
for name in python3 perl script gcc cc c++ g++ cpp as ld ld.bfd ld.gold vim vi vimdiff ex view emacs gdb tclsh expect socat tmux screen; do
  [[ $keep == *" $name "* ]] && continue
  path=$(command -v "$name" 2>/dev/null) || continue
  chmod 700 "$(readlink -f "$path")"
done
find /usr/local/lib/node_modules -name pty.node -not -path '*/@pavanmanishd/tui-use/*' -exec chmod 600 {} +
for host in registry.npmjs.org registry.yarnpkg.com pypi.org files.pythonhosted.org \
  github.com objects.githubusercontent.com codeload.github.com deb.debian.org; do
  echo "0.0.0.0 $host" >> /etc/hosts
done
