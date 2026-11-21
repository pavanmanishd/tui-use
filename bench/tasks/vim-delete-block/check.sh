#!/bin/bash
set -euo pipefail
expected=$(
  printf '# upstream servers\n'
  for i in $(seq 1 30); do printf 'server app%02d.internal:8080\n' "$i"; done
)
[ "$(cat /home/agent/work/upstreams.conf)" = "$expected" ]
