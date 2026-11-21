#!/bin/bash
set -euo pipefail
cd /home/agent/work/data
[ ! -e backups ]
[ "$(find . -type f | sort)" = "$(grep -v '^\./backups/' /root/.ncdu-delete-largest.files)" ]
