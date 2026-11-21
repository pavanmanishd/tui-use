#!/bin/bash
set -euo pipefail
entry=$(getent passwd carol)
[ -d /home/carol ]
python3 -W ignore - "$entry" <<'PY'
import crypt
import sys

fields = sys.argv[1].split(":")
gecos = fields[4].split(",")
if gecos[0] != "Carol Danvers" or len(gecos) < 2 or gecos[1] != "B-12" or any(gecos[2:]):
    sys.exit(f"unexpected GECOS {fields[4]!r}")
with open("/etc/shadow") as f:
    hashed = next(line.split(":")[1] for line in f if line.startswith("carol:"))
if crypt.crypt("Tr0ub4dor-77", hashed) != hashed:
    sys.exit("password does not match")
PY
