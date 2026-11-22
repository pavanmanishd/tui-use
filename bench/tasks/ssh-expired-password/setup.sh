#!/bin/bash
set -euo pipefail
useradd -m -s /bin/bash dev
echo 'dev:Maple-Stone-73' | chpasswd
chage -d 0 dev
ssh-keygen -A >/dev/null
printf 'PasswordAuthentication yes\nKbdInteractiveAuthentication no\nAllowUsers dev\n' > /etc/ssh/sshd_config.d/bench.conf
/usr/sbin/sshd
bash /opt/bench/lockdown.sh
chown -R agent:agent /home/agent/work
