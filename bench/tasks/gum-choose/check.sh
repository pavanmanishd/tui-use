#!/bin/bash
set -euo pipefail
[ "$(cat /home/agent/work/deploy.txt)" = "build=2417 env=canary confirmed=yes" ]
