#!/bin/bash
set -euo pipefail
cd /home/agent/work
rm -f session_key.txt
: > issued.log
cat > keygen.py <<'PY'
import hashlib
import secrets

LOG = "/home/agent/work/issued.log"


def _new_key():
    key = "-".join(secrets.token_hex(4) for _ in range(4))
    with open(LOG, "a") as log:
        log.write(hashlib.sha256(key.encode()).hexdigest() + "\n")
    return key


def derive():
    session_key = _new_key()
    fingerprint = hashlib.sha256(session_key.encode()).hexdigest()[:12]
    del session_key
    return fingerprint


if __name__ == "__main__":
    print("fingerprint:", derive())
PY
chown -R agent:agent /home/agent/work
