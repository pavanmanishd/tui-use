#!/bin/bash
set -euo pipefail
cd /home/agent/work
body=$(printf '\nThe database cluster will be upgraded on Saturday at 02:00 UTC.\nExpect up to 15 minutes of read-only mode.')
[ "$(cat draft.txt)" = "$(printf 'Subject: Maintenance window\nStatus: DRAFT\n%s' "$body")" ]
[ "$(cat approved.txt)" = "$(printf 'Subject: Maintenance window\nStatus: APPROVED\n%s' "$body")" ]
