#!/bin/bash
set -euo pipefail
cd /home/agent/work/shop
tui-use start "git add -p pagination.py" --name ap --until-regex "\(1/2\) Stage this hunk" >/dev/null
tui-use send ap --input n enter --until-regex "\(2/2\) Stage this hunk" >/dev/null
tui-use send ap --input y enter --until-exit >/dev/null
git commit -q -m "Fix off-by-one in paginate"
