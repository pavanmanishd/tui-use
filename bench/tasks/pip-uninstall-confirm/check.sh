#!/bin/bash
set -euo pipefail
cd /
if python3 -c 'import tinyfmt' 2>/dev/null; then exit 1; fi
if pip3 show tinyfmt >/dev/null 2>&1; then exit 1; fi
python3 -c 'import tinylog'
pip3 show tinylog >/dev/null 2>&1
