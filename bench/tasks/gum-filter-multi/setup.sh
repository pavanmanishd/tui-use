#!/bin/bash
set -euo pipefail
cd /home/agent/work
cat > pick-packages.sh <<'SH'
#!/bin/bash
set -euo pipefail
packages="curl wget jq jless yq htop iotop postgresql postgresql-client postgresql-contrib
redis redis-server redis-tools redis-sentinel mysql-client sqlite3 nginx certbot rsync tmux
git git-lfs make gcc python3 python3-pip nodejs ripgrep fd-find bat"
tr ' ' '\n' <<<"$packages" | gum filter --no-limit --header "Packages to install (tab selects)" > /home/agent/work/packages.txt
echo "Saved $(wc -l < /home/agent/work/packages.txt) packages"
SH
chmod +x pick-packages.sh
chown -R agent:agent /home/agent/work
