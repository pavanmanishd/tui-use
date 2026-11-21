#!/bin/bash
set -euo pipefail
cd /home/agent/work
tui-use start ./deploy.sh --name deploy --until-text production --timeout 10000 >/dev/null
tui-use send deploy --input down down down >/dev/null
tui-use snapshot deploy | grep -q '> canary'
tui-use send deploy --key enter --until-text "to canary?" --timeout 5000 >/dev/null
tui-use send deploy --key y --until-exit --timeout 5000 >/dev/null
