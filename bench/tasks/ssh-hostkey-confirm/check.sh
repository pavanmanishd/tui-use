#!/bin/bash
set -euo pipefail
[ "$(stat -c %U /home/ops/hello.txt)" = ops ]
[ "$(cat /home/ops/hello.txt)" = "hostkey ok" ]
known=/home/agent/.ssh/known_hosts
[ -f "$known" ]
found=no
for pub in /etc/ssh/ssh_host_*_key.pub; do
  if grep -qF "$(cut -d' ' -f2 "$pub")" "$known"; then found=yes; fi
done
[ "$found" = yes ]
