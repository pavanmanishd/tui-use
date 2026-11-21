---
category: pickers
---
Run the script `/home/agent/work/server-setup.sh`. It shows a whiptail checklist of services to install, where some items start out checked, and records the confirmed selection in `/home/agent/work/services.txt`.

In the checklist, make sure exactly these services are checked and no others: `postgresql`, `redis` and `fail2ban`. Then confirm with OK. Do not edit the script or write `services.txt` yourself.
