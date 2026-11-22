#!/bin/bash
set -euo pipefail
useradd -r -m -d /var/lib/wizard -s /usr/sbin/nologin wizard
chmod 700 /var/lib/wizard
regions=(eu-west-1 eu-central-1 us-east-1 us-west-2 ap-south-1 ap-northeast-1)
mapfile -t shuffled < <(printf '%s\n' "${regions[@]}" | shuf)
printf '%s\n' "${shuffled[@]}" > /var/lib/wizard/regions
shuf -n1 /var/lib/wizard/regions > /var/lib/wizard/primary
addons=(metrics logging backups autoscaler ingress)
for a in "${addons[@]}"; do echo "$a $([ $((RANDOM % 2)) = 1 ] && echo ON || echo OFF)"; done > /var/lib/wizard/addons
cp /var/lib/wizard/primary /root/wizard-primary
chown -R wizard:wizard /var/lib/wizard
cat > /usr/local/bin/cluster-wizard <<'WIZ'
#!/bin/bash
set -u
cd /var/lib/wizard || exit 1
primary=$(cat primary)
items=()
while read -r r; do
  items+=("$r" "$([ "$r" = "$primary" ] && echo "primary" || echo "standby")")
done < regions
ask() { whiptail --title "Cluster wizard" "$@" 3>&1 1>&2 2>&3; }
region=$(ask --menu "Step 1 of 5: choose a region" 16 60 6 "${items[@]}") || exit 1
name=$(ask --inputbox "Step 2 of 5: cluster name" 10 60 "cluster-$RANDOM") || exit 1
size=$(ask --radiolist "Step 3 of 5: node size" 14 60 4 \
  t3.medium "2 vCPU, 4 GiB" ON m6.large "2 vCPU, 8 GiB" OFF \
  m6.xlarge "4 vCPU, 16 GiB" OFF c6.2xlarge "8 vCPU, 16 GiB" OFF) || exit 1
checks=()
while read -r a state; do checks+=("$a" "add-on" "$state"); done < addons
picked=$(ask --checklist "Step 4 of 5: add-ons" 15 60 5 "${checks[@]}") || exit 1
picked=$(tr -d '"' <<<"$picked" | tr ' ' '\n' | sed '/^$/d' | sort | tr '\n' ' ')
ask --yesno "Step 5 of 5: create $name in $region with $size nodes?" 10 60 || { echo cancelled > plan; exit 1; }
printf 'region=%s\nname=%s\nsize=%s\naddons=%s\n' "$region" "$name" "$size" "${picked% }" > plan
echo "Plan saved."
WIZ
chmod 755 /usr/local/bin/cluster-wizard
bash /opt/bench/lockdown.sh
echo 'agent ALL=(wizard) NOPASSWD: /usr/local/bin/cluster-wizard' > /etc/sudoers.d/wizard
chmod 440 /etc/sudoers.d/wizard
chown -R agent:agent /home/agent/work
