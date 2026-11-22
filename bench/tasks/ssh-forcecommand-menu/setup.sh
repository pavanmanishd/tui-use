#!/bin/bash
set -euo pipefail
useradd -m -s /bin/bash ops
echo 'ops:Copper-Fern-19' | chpasswd
chmod 700 /home/ops
cat > /usr/local/bin/ops-menu <<'MENU'
#!/bin/bash
set -u
if [ ! -t 0 ]; then
  echo "ops-menu: this menu needs a terminal" >&2
  exit 1
fi
log="$HOME/actions.log"
while true; do
  choice=$(whiptail --title "payments-api operations" --nocancel --menu "Choose an action" 16 60 5 \
    status "Show service status" \
    rotate "Rotate logs" \
    flush "Flush the cache" \
    restart "Restart workers" \
    exit "Exit" 3>&1 1>&2 2>&3) || exit 1
  case "$choice" in
    status) whiptail --title "Status" --msgbox "payments-api: running, 4 workers, cache 81% full" 8 60 ;;
    rotate | restart) echo "$choice" >> "$log"; whiptail --msgbox "Done: $choice" 8 40 ;;
    flush)
      code=$(printf '%04d' $((RANDOM % 10000)))
      typed=$(whiptail --title "Confirm" --inputbox "Flushing drops every cached session.\nType the code $code to confirm." 10 60 3>&1 1>&2 2>&3) || continue
      if [ "$typed" = "$code" ]; then
        echo "flush-cache confirmed" >> "$log"
        whiptail --msgbox "Cache flushed." 8 40
      else
        echo "flush-cache wrong-code" >> "$log"
        whiptail --msgbox "Wrong code, nothing flushed." 8 40
      fi
      ;;
    exit) echo "menu exit" >> "$log"; exit 0 ;;
  esac
done
MENU
chmod 755 /usr/local/bin/ops-menu
ssh-keygen -A >/dev/null
cat > /etc/ssh/sshd_config.d/bench.conf <<'CONF'
PasswordAuthentication yes
KbdInteractiveAuthentication no
AllowUsers ops
Match User ops
  ForceCommand /usr/local/bin/ops-menu
  AllowTcpForwarding no
CONF
/usr/sbin/sshd
bash /opt/bench/lockdown.sh
chown -R agent:agent /home/agent/work
