#!/bin/bash
set -euo pipefail
cd /home/agent/work
rm -f site.csr
openssl genrsa -out site.key 2048 2>/dev/null
chown -R agent:agent /home/agent/work
