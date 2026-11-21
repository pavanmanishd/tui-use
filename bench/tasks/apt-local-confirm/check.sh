#!/bin/bash
set -euo pipefail
for p in hello-tui cowsay; do
  [ "$(dpkg-query -W -f='${Status}' "$p" 2>/dev/null)" = "install ok installed" ]
done
hello-tui | grep -q "hello from hello-tui"
