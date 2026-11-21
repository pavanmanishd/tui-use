#!/bin/bash
set -euo pipefail
[ "$(cat /home/agent/work/region.txt)" = "eu-central-2" ]
