#!/bin/bash
set -euo pipefail
cd /home/agent/work
cat > server-setup.sh <<'SH'
#!/bin/bash
set -uo pipefail
choices=$(whiptail --title "Server setup" --checklist "Select the services to install on this host" 18 70 8 \
  nginx "Web server" ON \
  postgresql "Relational database" OFF \
  redis "In-memory cache" OFF \
  certbot "TLS certificates" OFF \
  fail2ban "Brute-force protection" ON \
  prometheus "Metrics collection" OFF \
  grafana "Dashboards" OFF \
  3>&1 1>&2 2>&3)
if [ $? -ne 0 ]; then
  echo cancelled > /home/agent/work/services.txt
  exit 1
fi
tr -d '"' <<<"$choices" | tr ' ' '\n' | sed '/^$/d' > /home/agent/work/services.txt
echo "Will install: $(tr '\n' ' ' < /home/agent/work/services.txt)"
SH
chmod +x server-setup.sh
chown -R agent:agent /home/agent/work
