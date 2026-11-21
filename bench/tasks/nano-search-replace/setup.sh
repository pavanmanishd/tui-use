#!/bin/bash
set -euo pipefail
cd /home/agent/work
cat > deploy.env <<'ENV'
API_URL=https://staging.example.com/api
CDN_URL=https://cdn.staging.example.com/assets
STAGE=staging
AUTH_URL=https://staging.example.com/auth
WEBHOOK_URL=https://hooks.example.net/notify?host=staging.example.com
LOG_LEVEL=info
ENV
chown -R agent:agent /home/agent/work
