#!/bin/bash
set -euo pipefail
key=$(tr -d '[:space:]' < /home/agent/work/session_key.txt)
[[ "$key" =~ ^[0-9a-f]{8}(-[0-9a-f]{8}){3}$ ]]
digest=$(printf '%s' "$key" | sha256sum | cut -d' ' -f1)
grep -qx "$digest" /home/agent/work/issued.log
