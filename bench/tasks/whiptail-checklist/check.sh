#!/bin/bash
set -euo pipefail
[ "$(sort /home/agent/work/services.txt)" = "$(printf 'fail2ban\npostgresql\nredis')" ]
