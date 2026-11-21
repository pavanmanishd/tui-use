#!/bin/bash
set -euo pipefail
cd /home/agent/work
cat > draft.txt <<'TXT'
Subject: Maintenance window
Status: DRAFT

The database cluster will be upgraded on Saturday at 02:00 UTC.
Expect up to 15 minutes of read-only mode.
TXT
chown -R agent:agent /home/agent/work
