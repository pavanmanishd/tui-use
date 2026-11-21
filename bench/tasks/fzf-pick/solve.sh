#!/bin/bash
set -euo pipefail
cd /home/agent/work
tui-use start ./pick-region.sh --name pick --until-text "region>" --timeout 10000 >/dev/null
tui-use send pick --text "eu-central-2" >/dev/null
tui-use snapshot pick | grep -qE '«> eu-central-2»'
tui-use send pick --key enter --until-exit --timeout 5000 >/dev/null
