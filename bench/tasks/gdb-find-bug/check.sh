#!/bin/bash
set -euo pipefail
[ "$(tr -d '[:space:]' < /home/agent/work/acc.txt)" = "$(tr -d '[:space:]' < /root/gdb-expected-acc)" ]
