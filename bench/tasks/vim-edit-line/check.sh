#!/bin/bash
set -euo pipefail
expected=$(printf '[server]\nhost = 0.0.0.0\ntimeout = 90\nretries = 3')
[ "$(cat /home/agent/work/config.ini)" = "$expected" ]
