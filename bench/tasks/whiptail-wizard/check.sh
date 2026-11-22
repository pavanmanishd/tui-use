#!/bin/bash
set -euo pipefail
expected=$(printf 'region=%s\nname=orion-blue\nsize=m6.large\naddons=backups metrics' "$(cat /root/wizard-primary)")
[ "$(cat /var/lib/wizard/plan)" = "$expected" ]
