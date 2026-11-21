#!/bin/bash
set -euo pipefail
useradd -m -s /bin/bash ops
echo 'ops:Maple-Stone-58' | chpasswd
mkdir -p /home/ops/reports /home/ops/incoming
python3 - <<'PY'
import random
rng = random.Random(2417)
rows = ["region,month,orders,revenue"]
for region in ["north", "south", "east", "west"]:
    for month in ["2024-07", "2024-08", "2024-09"]:
        rows.append(f"{region},{month},{rng.randint(800, 5000)},{rng.randint(10000, 90000)}.{rng.randint(0, 99):02d}")
open("/home/ops/reports/q3-summary.csv", "w").write("\n".join(rows) + "\n")
open("/home/ops/reports/q2-summary.csv", "w").write("region,month,orders,revenue\nnorth,2024-04,1,1.00\n")
PY
chown -R ops:ops /home/ops
mkdir -p /home/agent/work/downloads /home/agent/work/release/build
cd /home/agent/work/release
for f in app.js vendor.js index.html; do head -c 40000 /dev/urandom | base64 > "build/$f"; done
tar czf build-2417.tar.gz build
rm -rf build
sha256sum /home/ops/reports/q3-summary.csv build-2417.tar.gz | cut -d' ' -f1 > /root/.sftp-transfer.sha256
ssh-keygen -A >/dev/null
printf 'PasswordAuthentication yes\nKbdInteractiveAuthentication no\n' > /etc/ssh/sshd_config.d/bench.conf
/usr/sbin/sshd
chown -R agent:agent /home/agent/work
