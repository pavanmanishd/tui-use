#!/bin/bash
set -euo pipefail
cd /home/agent/work
tui-use start node --name node --until-text ".help" --timeout 30000 >/dev/null
tui-use send node --text "const inv = await require('./inventory').load(); typeof inv.save === 'function'" --key enter --until-text "true" --timeout 30000 >/dev/null
tui-use send node --text "inv.take('gear', 7)" --key enter >/dev/null
tui-use send node --text "inv.add('spring', 12)" --key enter >/dev/null
tui-use send node --text "inv.take('bolt', Math.floor(inv.count('bolt') / 2))" --key enter >/dev/null
tui-use send node --text "inv.save('/home/agent/work/inventory.json')" --key enter >/dev/null
tui-use send node --text ".exit" --key enter --until-exit --timeout 10000 >/dev/null
