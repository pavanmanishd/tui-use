#!/bin/bash
set -euo pipefail
mkdir -p /home/agent/work/logs
python3 - <<'PY'
import random
from datetime import datetime, timedelta

rng = random.Random(4711)
t = datetime(2024, 6, 12, 0, 0, 0)
services = ["orders", "payments", "auth", "search", "inventory", "shipping"]
infos = ["GET /api/v2/orders 200", "POST /api/v2/cart 201", "cache refresh done", "GET /health 200",
         "user session renewed", "PUT /api/v2/address 200", "batch flushed", "GET /api/v2/search 200"]
errors = ["upstream timeout after 3000ms", "connection reset by peer", "card declined by issuer",
          "ledger write retried", "checksum verification skipped", "invalid coupon code",
          "settlement batch delayed", "ledger balance mismatch (rounding)"]

def rid():
    return "req-" + "".join(rng.choice("0123456789abcdef") for _ in range(10))

target_at = 41_237
out = []
for i in range(60_000):
    t += timedelta(milliseconds=rng.randint(5, 900))
    ts = t.strftime("%Y-%m-%dT%H:%M:%S.") + f"{t.microsecond // 1000:03d}Z"
    svc = rng.choice(services)
    if i == target_at:
        out.append(f"{ts} ERROR [payments] settlement batch 8812 failed: ledger checksum mismatch")
        out.append(f"{ts}       request_id=req-7c41e09b3d trace=9f1e22a0 retry=false")
        continue
    if rng.random() < 0.04:
        out.append(f"{ts} ERROR [{svc}] {rng.choice(errors)}")
        out.append(f"{ts}       request_id={rid()} trace={rng.getrandbits(32):08x} retry={rng.choice(['true', 'false'])}")
    else:
        out.append(f"{ts} INFO  [{svc}] {rng.choice(infos)} request_id={rid()}")
with open("/home/agent/work/logs/app.log", "w") as f:
    f.write("\n".join(out) + "\n")
PY
chown -R agent:agent /home/agent/work
