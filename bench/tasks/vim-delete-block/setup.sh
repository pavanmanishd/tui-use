#!/bin/bash
set -euo pipefail
cd /home/agent/work
{
  printf '# upstream servers\n'
  for i in $(seq 1 15); do printf 'server app%02d.internal:8080\n' "$i"; done
  printf '# BEGIN legacy\n'
  for i in $(seq 1 8); do printf 'server old%02d.internal:8080 backup\n' "$i"; done
  printf '# END legacy\n'
  for i in $(seq 16 30); do printf 'server app%02d.internal:8080\n' "$i"; done
} > upstreams.conf
chown -R agent:agent /home/agent/work
