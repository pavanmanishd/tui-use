#!/bin/bash
set -euo pipefail
if id carol >/dev/null 2>&1; then deluser --remove-home carol >/dev/null; fi
chown -R agent:agent /home/agent/work
