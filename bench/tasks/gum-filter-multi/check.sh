#!/bin/bash
set -euo pipefail
[ "$(sort /home/agent/work/packages.txt)" = "$(printf 'jq\npostgresql-client\nredis-tools')" ]
