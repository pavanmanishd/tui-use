#!/bin/bash
set -euo pipefail
answer=$(tr -d '[:space:]' < /home/agent/work/answer.txt)
[ "$answer" = "req-7c41e09b3d" ] || [ "$answer" = "request_id=req-7c41e09b3d" ]
