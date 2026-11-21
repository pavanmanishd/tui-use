#!/bin/bash
set -euo pipefail
cd /home/agent/work
cat > deploy.sh <<'SH'
#!/bin/bash
set -euo pipefail
env=$(gum choose --header "Deploy build 2417 to which environment?" dev qa staging canary production)
if gum confirm "Deploy build 2417 to $env?"; then
  echo "build=2417 env=$env confirmed=yes" > /home/agent/work/deploy.txt
  echo "Deploying build 2417 to $env"
else
  echo "build=2417 env=$env confirmed=no" > /home/agent/work/deploy.txt
  echo "Cancelled"
fi
SH
chmod +x deploy.sh
chown -R agent:agent /home/agent/work
