#!/bin/bash
set -euo pipefail
python3 - <<'PY'
import hashlib
import sys

seed = open("/root/sensor.seed").read().strip()


def sample(n):
    return int(hashlib.sha256(f"{seed}:{n}".encode()).hexdigest()[:8], 16) % 1000


offset = sample(1)
want = [(sample(n) - offset) % 1000 for n in (2, 3, 4)]
try:
    got = [int(x) for x in open("/home/agent/work/readings.txt").read().split()]
except (OSError, ValueError) as e:
    sys.exit(str(e))
if got != want:
    sys.exit(f"readings {got}, want {want}")
PY
