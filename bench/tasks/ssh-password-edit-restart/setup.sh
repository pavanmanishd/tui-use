#!/bin/bash
set -euo pipefail
useradd -m -s /bin/bash ops
echo 'ops:Harbor-Lamp-42' | chpasswd
mkdir -p /home/ops/app /home/ops/bin
printf '# payments-api\nlisten = 0.0.0.0:8080\nworkers = 2\nlog_level = info\n' > /home/ops/app/app.conf
cat > /home/ops/bin/restart-app <<'SH'
#!/bin/bash
set -euo pipefail
workers=$(sed -n 's/^workers *= *//p' "$HOME/app/app.conf")
echo "restart user=$(id -un) workers=$workers ssh=${SSH_CONNECTION:+yes}" >> "$HOME/app/restarts.log"
echo "payments-api restarted with $workers workers"
SH
chmod 755 /home/ops/bin/restart-app
chown -R ops:ops /home/ops
ssh-keygen -A >/dev/null
printf 'PasswordAuthentication yes\nKbdInteractiveAuthentication no\n' > /etc/ssh/sshd_config.d/bench.conf
/usr/sbin/sshd
chown -R agent:agent /home/agent/work
