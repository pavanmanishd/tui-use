#!/bin/bash
set -euo pipefail
cd /home/agent/work
rm -f readings.txt
head -c 16 /dev/urandom | od -An -tx1 | tr -d ' \n' > sensor.seed
cp sensor.seed /root/sensor.seed
cat > sensor.py <<'PY'
import hashlib
import time

with open("/home/agent/work/sensor.seed") as f:
    _SEED = f.read().strip()


class Sensor:
    def __init__(self):
        print("calibrating...", flush=True)
        time.sleep(8)
        self._count = 0
        self._offset = 0
        print("ready")

    def _sample(self):
        self._count += 1
        digest = hashlib.sha256(f"{_SEED}:{self._count}".encode()).hexdigest()
        return int(digest[:8], 16) % 1000

    def zero(self):
        self._offset = self._sample()

    def read(self):
        return (self._sample() - self._offset) % 1000
PY
chown -R agent:agent /home/agent/work
