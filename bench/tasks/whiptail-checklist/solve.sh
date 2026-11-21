#!/bin/bash
set -euo pipefail
cd /home/agent/work
tui-use start ./server-setup.sh --name setup --until-text "Server setup" --timeout 10000 >/dev/null
tui-use send setup --input space down space down space >/dev/null
[ "$(tui-use snapshot setup --styles none | grep -oE '\[\*\] [a-z0-9]+' | cut -d' ' -f2 | sort | tr '\n' ' ')" = "fail2ban postgresql redis " ]
tui-use send setup --input tab enter --until-exit --timeout 5000 >/dev/null
