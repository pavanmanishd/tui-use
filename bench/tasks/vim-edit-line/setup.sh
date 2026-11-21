#!/bin/bash
set -euo pipefail
cd /home/agent/work
printf '[server]\nhost = 0.0.0.0\ntimeout = 30\nretries = 3\n' > config.ini
chown -R agent:agent /home/agent/work
