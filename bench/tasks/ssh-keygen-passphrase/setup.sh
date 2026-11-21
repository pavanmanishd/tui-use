#!/bin/bash
set -euo pipefail
mkdir -p /home/agent/work/keys
rm -f /home/agent/work/keys/deploy_key /home/agent/work/keys/deploy_key.pub
chown -R agent:agent /home/agent/work
