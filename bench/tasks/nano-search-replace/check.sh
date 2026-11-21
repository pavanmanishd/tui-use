#!/bin/bash
set -euo pipefail
expected=$(cat <<'ENV'
API_URL=https://prod.example.com/api
CDN_URL=https://cdn.prod.example.com/assets
STAGE=staging
AUTH_URL=https://prod.example.com/auth
WEBHOOK_URL=https://hooks.example.net/notify?host=prod.example.com
LOG_LEVEL=info
ENV
)
[ "$(cat /home/agent/work/deploy.env)" = "$expected" ]
