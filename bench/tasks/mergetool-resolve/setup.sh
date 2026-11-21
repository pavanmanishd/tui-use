#!/bin/bash
set -euo pipefail
repo=/home/agent/work/service
mkdir -p "$repo" && cd "$repo"
git init -q
n=0
commit() {
  n=$((n + 1))
  export GIT_AUTHOR_DATE="2024-07-15T11:0$n:00+0000" GIT_COMMITTER_DATE="2024-07-15T11:0$n:00+0000"
  git add -A
  git commit -q -m "$1"
}
cat > config.yml <<'YML'
service:
  name: billing
  port: 8080
  workers: 4
  region: eu-west-1
  owner: payments
  tier: gold
  retries: 3
  log_level: info
  timeout: 30
YML
commit "Add service config"
git checkout -q -b feature
sed -i -e 's/port: 8080/port: 8443/' -e 's/log_level: info/log_level: debug/' config.yml
commit "Serve over TLS with debug logging"
git checkout -q main
sed -i -e 's/port: 8080/port: 9090/' -e 's/log_level: info/log_level: warn/' config.yml
commit "Move to port 9090 and quieter logs"
mkdir -p /root/.bench
git rev-parse main feature > /root/.bench/mergetool-resolve
export GIT_AUTHOR_DATE="2024-07-15T11:30:00+0000" GIT_COMMITTER_DATE="2024-07-15T11:30:00+0000"
if git merge feature >/dev/null 2>&1; then exit 1; fi
chown -R agent:agent /home/agent/work
