#!/bin/bash
set -euo pipefail
useradd -m -s /bin/bash ops
echo 'ops:Copper-Field-17' | chpasswd
ssh-keygen -A >/dev/null
printf 'PasswordAuthentication yes\nKbdInteractiveAuthentication no\n' > /etc/ssh/sshd_config.d/bench.conf
/usr/sbin/sshd
chown -R agent:agent /home/agent/work
