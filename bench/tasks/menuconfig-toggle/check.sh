#!/bin/bash
set -euo pipefail
cd /home/agent/work
python3 - <<'PY'
import sys
import kconfiglib

kconf = kconfiglib.Kconfig("Kconfig", warn=False)
kconf.load_config(".config", replace=True)
expected = {
    "LISTEN_PORT": "8080", "ENABLE_TLS": "y", "HTTP2": "y", "ACCESS_LOG": "y",
    "METRICS": "y", "METRICS_PORT": "9100", "CACHE": "y", "CACHE_SIZE_MB": "256",
    "CACHE_TTL_SECONDS": "300",
}
actual = {name: kconf.syms[name].str_value for name in expected}
sys.exit(0 if actual == expected else 1)
PY
grep -qx 'CONFIG_METRICS=y' .config
grep -qx 'CONFIG_CACHE_SIZE_MB=256' .config
