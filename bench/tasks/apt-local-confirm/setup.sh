#!/bin/bash
set -euo pipefail
dpkg -r hello-tui cowsay libtext-charwidth-perl >/dev/null 2>&1 || true
chown -R agent:agent /home/agent/work
