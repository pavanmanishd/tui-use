#!/bin/bash
set -euo pipefail
python3 - <<'PY'
import hashlib
import json
import sys

seed = open("/root/inventory.seed").read().strip()
want = {n: 20 + hashlib.sha256(f"{seed}:{n}".encode()).digest()[0] % 80 for n in ("bolt", "nut", "gear", "spring")}
want["gear"] -= 7
want["spring"] += 12
want["bolt"] -= want["bolt"] // 2
try:
    got = json.load(open("/home/agent/work/inventory.json"))
except (OSError, ValueError) as e:
    sys.exit(str(e))
if got != want:
    sys.exit(f"inventory {got}, want {want}")
PY
