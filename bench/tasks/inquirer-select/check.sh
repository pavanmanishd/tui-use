#!/bin/bash
set -euo pipefail
python3 - <<'PY'
import json
import sys

data = json.load(open("/home/agent/work/service.json"))
ok = (
    data.get("language") == "Rust"
    and data.get("database") == "PostgreSQL"
    and sorted(data.get("features", [])) == ["Kafka consumer", "Prometheus metrics", "gRPC API"]
)
sys.exit(0 if ok else 1)
PY
