#!/bin/bash
set -euo pipefail
cd /home/agent/work
tui-use start ./new-service.py --name svc --until-text "Which language" --timeout 10000 >/dev/null
tui-use send svc --input down down down down >/dev/null
tui-use snapshot svc --styles none | grep -q '» Rust'
tui-use send svc --key enter --until-text "Which database" --timeout 5000 >/dev/null
tui-use send svc --input down down >/dev/null
tui-use snapshot svc --styles none | grep -q '» PostgreSQL'
tui-use send svc --key enter --until-text "Which features" --timeout 5000 >/dev/null
tui-use send svc --input space down space down space >/dev/null
[ "$(tui-use snapshot svc --styles none | grep -c '●')" = 3 ]
tui-use send svc --key enter --until-exit --timeout 5000 >/dev/null
