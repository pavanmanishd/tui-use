#!/bin/bash
set -euo pipefail
cd /home/agent/work
tui-use start "vim stats.py" --name ed --until-text stats.py >/dev/null
tui-use send ed --input ':%s/\<count\>/total/g' enter ":wq" enter --until-exit >/dev/null
