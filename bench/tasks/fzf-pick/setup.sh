#!/bin/bash
set -euo pipefail
cd /home/agent/work
cat > pick-region.sh <<'SH'
#!/bin/bash
set -euo pipefail
regions="us-east-1 us-east-2 us-west-1 us-west-2 ca-central-1 sa-east-1 eu-west-1 eu-west-2 eu-west-3
eu-central-1 eu-central-2 eu-north-1 eu-south-1 eu-south-2 me-central-1 me-south-1 af-south-1
ap-south-1 ap-south-2 ap-east-1 ap-northeast-1 ap-northeast-2 ap-northeast-3 ap-southeast-1
ap-southeast-2 ap-southeast-3 ap-southeast-4 il-central-1"
choice=$(tr ' ' '\n' <<<"$regions" | fzf --prompt "region> ")
echo "$choice" > /home/agent/work/region.txt
echo "Saved region: $choice"
SH
chmod +x pick-region.sh
chown -R agent:agent /home/agent/work
